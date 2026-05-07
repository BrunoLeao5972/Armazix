import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/lib/db";
import { paymentAudits, paymentWebhookEvents } from "@/lib/db/schema";

type MercadoPagoPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
  date_approved?: string | null;
  date_created?: string | null;
  transaction_amount?: number;
};

function parseXSignature(raw: string | null) {
  if (!raw) return null;
  const parts = raw.split(",").map((part) => part.trim());
  const map = new Map<string, string>();
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    map.set(k.trim(), v.trim());
  }
  const ts = map.get("ts");
  const v1 = map.get("v1");
  if (!ts || !v1) return null;
  return { ts, v1 };
}

function isTimestampFresh(ts: string, maxSkewSeconds = 300) {
  const tsSeconds = Number(ts);
  if (!Number.isFinite(tsSeconds)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.abs(nowSeconds - tsSeconds) <= maxSkewSeconds;
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyWebhookSignature(request: Request, url: URL) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }

  const xSignature = parseXSignature(request.headers.get("x-signature"));
  const xRequestId = request.headers.get("x-request-id")?.trim();
  const dataId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    "";

  if (!xSignature || !xRequestId || !dataId) return false;
  if (!isTimestampFresh(xSignature.ts)) return false;

  // Template follows Mercado Pago webhook signature docs.
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${xSignature.ts};`;
  const expected = await hmacSha256Hex(secret, manifest);
  return timingSafeEqualHex(expected, xSignature.v1);
}

async function fetchMercadoPagoPayment(paymentId: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN nao configurado no servidor.");
  }

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao consultar pagamento no MercadoPago (${res.status}).`);
  }

  return (await res.json()) as MercadoPagoPayment;
}

async function markWebhookEventProcessed(providerEventId: string, paymentId: string) {
  const db = getDb();
  const result = await db
    .insert(paymentWebhookEvents)
    .values({
      provider: "mercadopago",
      providerEventId,
      paymentId,
    })
    .onConflictDoNothing()
    .returning({ id: paymentWebhookEvents.id });

  return result.length > 0;
}

async function auditWebhookEvent(payload: {
  eventType: string;
  paymentId: string;
  status: string;
  externalReference: string | null;
  amount: number | null;
  rawPayload: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(paymentAudits).values({
    provider: "mercadopago",
    eventType: payload.eventType,
    paymentId: payload.paymentId,
    externalReference: payload.externalReference,
    status: payload.status,
    amountCents:
      typeof payload.amount === "number"
        ? Math.round(payload.amount * 100)
        : null,
    payload: payload.rawPayload,
  });
}

export const Route = createFileRoute("/api/mercadopago/webhook")({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const providerEventId =
          request.headers.get("x-request-id")?.trim() ||
          crypto.randomUUID();
        const signatureOk = await verifyWebhookSignature(request, url);
        if (!signatureOk) {
          return Response.json({ ok: false, error: "invalid signature" }, { status: 401 });
        }

        const eventType =
          url.searchParams.get("type") ??
          url.searchParams.get("topic") ??
          "unknown";

        const paymentId =
          url.searchParams.get("data.id") ??
          url.searchParams.get("id") ??
          "";

        if (!paymentId || !/^\d+$/.test(paymentId)) {
          return Response.json({ ok: true, ignored: true }, { status: 200 });
        }

        const isNewEvent = await markWebhookEventProcessed(providerEventId, paymentId);
        if (!isNewEvent) {
          return Response.json({ ok: true, duplicate: true }, { status: 200 });
        }

        try {
          const payment = await fetchMercadoPagoPayment(paymentId);
          await auditWebhookEvent({
            eventType,
            paymentId,
            status: String(payment.status ?? "unknown"),
            externalReference: payment.external_reference ?? null,
            amount:
              typeof payment.transaction_amount === "number"
                ? payment.transaction_amount
                : null,
            rawPayload: {
              headers: {
                xRequestId: request.headers.get("x-request-id"),
                xSignature: request.headers.get("x-signature"),
              },
              query: Object.fromEntries(url.searchParams.entries()),
              payment,
            },
          });
        } catch (error) {
          console.error("[mercadopago-webhook] processing error", error);
          return Response.json({ ok: false }, { status: 500 });
        }

        return Response.json({ ok: true }, { status: 200 });
      },
    },
  },
});
