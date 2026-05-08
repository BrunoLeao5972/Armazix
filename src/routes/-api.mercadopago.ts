import { createServerFn } from "@tanstack/react-start";
import type { CreatePreferenceInput, PreferenceResult } from "@/lib/mercadopago";
import { PDV_ADDON_PRICE, PLAN_NAMES, PLAN_PRICES, type Plan } from "@/lib/plans";
import { getAppBaseUrl } from "@/lib/env";

const PLAN_SET = new Set<Plan>(["free", "start", "pro", "full"]);
const ORDER_REF_REGEX = /^order:[a-z0-9-]+:[a-z0-9-]+$/i;
const PLAN_OR_PDV_REF_REGEX = /^(plan|pdv):([a-z]+):([a-z0-9-]+)$/i;

function sanitizeItems(items: CreatePreferenceInput["items"]) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new Error("Lista de itens de pagamento invalida.");
  }

  return items.map((item) => {
    const title = String(item.title ?? "").trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);

    if (!title || title.length > 120) {
      throw new Error("Titulo de item invalido.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error("Quantidade de item invalida.");
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 1_000_000) {
      throw new Error("Preco de item invalido.");
    }

    return {
      title,
      quantity,
      unit_price: Math.round(unitPrice * 100) / 100,
      currency_id: item.currency_id ?? "BRL",
    };
  });
}

function getBaseOrigin(input: CreatePreferenceInput): string {
  try {
    const envBaseUrl = getAppBaseUrl();
    if (envBaseUrl) {
      return new URL(envBaseUrl).origin;
    }
  } catch {
    // Fallback se getAppBaseUrl falhar
  }

  const success = new URL(input.backUrls.success);
  const failure = new URL(input.backUrls.failure);
  const pending = new URL(input.backUrls.pending);

  if (success.origin !== failure.origin || success.origin !== pending.origin) {
    throw new Error("URLs de retorno invalidas: origem divergente.");
  }

  return success.origin;
}

function resolveBackUrls(baseOrigin: string, externalReference: string) {
  if (ORDER_REF_REGEX.test(externalReference)) {
    const [, slug] = externalReference.split(":");
    const baseUrl = `${baseOrigin}/loja/${slug}/checkout`;
    return {
      success: `${baseUrl}?collection_status=approved&external_reference=${externalReference}`,
      failure: `${baseUrl}?collection_status=failure&external_reference=${externalReference}`,
      pending: `${baseUrl}?collection_status=pending&external_reference=${externalReference}`,
    };
  }

  const planRefMatch = externalReference.match(PLAN_OR_PDV_REF_REGEX);
  if (planRefMatch) {
    return {
      success: `${baseOrigin}/admin/plano`,
      failure: `${baseOrigin}/admin/plano`,
      pending: `${baseOrigin}/admin/plano`,
    };
  }

  throw new Error("externalReference invalida.");
}

function resolveTrustedItems(input: CreatePreferenceInput) {
  const externalReference = String(input.externalReference ?? "").trim();
  const planRefMatch = externalReference.match(PLAN_OR_PDV_REF_REGEX);
  if (!planRefMatch) {
    if (!ORDER_REF_REGEX.test(externalReference)) {
      throw new Error("Referencia de pedido invalida.");
    }
    return sanitizeItems(input.items);
  }

  const [, kind, planCandidate] = planRefMatch;
  const plan = planCandidate.toLowerCase() as Plan;
  if (!PLAN_SET.has(plan)) {
    throw new Error("Plano invalido.");
  }

  if (kind.toLowerCase() === "plan") {
    return [
      {
        title: `Armazix - Plano ${PLAN_NAMES[plan]}`,
        quantity: 1,
        unit_price: PLAN_PRICES[plan],
        currency_id: "BRL",
      },
    ];
  }

  return [
    {
      title: `Armazix - Adicional PDV (${PLAN_NAMES[plan]})`,
      quantity: 1,
      unit_price: PDV_ADDON_PRICE,
      currency_id: "BRL",
    },
  ];
}

function requireMercadoPagoToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado no servidor.");
  }
  return token;
}

export const createMercadoPagoPreferenceFn = createServerFn({ method: "POST" })
  .inputValidator((input: CreatePreferenceInput) => input)
  .handler(async ({ data }): Promise<PreferenceResult> => {
    const token = requireMercadoPagoToken();

    const externalReference = String(data.externalReference ?? "").trim();
    const items = resolveTrustedItems(data);
    const baseOrigin = getBaseOrigin(data);
    const backUrls = resolveBackUrls(baseOrigin, externalReference);
    const webhookUrl =
      process.env.MERCADOPAGO_WEBHOOK_URL?.trim() ||
      `${baseOrigin}/api/mercadopago/webhook`;

    const preference = {
      items,
      back_urls: {
        success: backUrls.success,
        failure: backUrls.failure,
        pending: backUrls.pending,
      },
      auto_return: "approved",
      external_reference: externalReference,
      ...(webhookUrl
        ? { notification_url: webhookUrl }
        : {}),
    };

    const res = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(preference),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MercadoPago error ${res.status}: ${err}`);
    }

    const json = (await res.json()) as {
      id: string;
      init_point: string;
      sandbox_init_point: string;
    };

    return {
      id: json.id,
      initPoint: json.init_point,
      sandboxInitPoint: json.sandbox_init_point,
    };
  });

type VerifyPaymentInput = {
  paymentId: string;
  expectedExternalReference?: string;
};

type VerifyPaymentResult = {
  ok: boolean;
  status: "approved" | "pending" | "rejected" | "cancelled" | "unknown";
  externalReference: string | null;
  message?: string;
};

export const verifyMercadoPagoPaymentFn = createServerFn({ method: "POST" })
  .inputValidator((input: VerifyPaymentInput) => input)
  .handler(async ({ data }): Promise<VerifyPaymentResult> => {
    const token = requireMercadoPagoToken();
    const paymentId = String(data.paymentId ?? "").trim();
    const expectedExternalReference = String(
      data.expectedExternalReference ?? "",
    ).trim();

    if (!/^\d+$/.test(paymentId)) {
      return {
        ok: false,
        status: "unknown",
        externalReference: null,
        message: "payment_id invalido.",
      };
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        status: "unknown",
        externalReference: null,
        message: `Erro ao consultar pagamento no MercadoPago (${res.status}).`,
      };
    }

    const json = (await res.json()) as {
      status?: string;
      external_reference?: string | null;
    };

    const externalReference = json.external_reference ?? null;
    if (
      expectedExternalReference &&
      externalReference &&
      expectedExternalReference !== externalReference
    ) {
      return {
        ok: false,
        status: "unknown",
        externalReference,
        message: "Referencia externa divergente.",
      };
    }

    const status = String(json.status ?? "").toLowerCase();
    if (status === "approved") {
      return { ok: true, status: "approved", externalReference };
    }
    if (status === "pending" || status === "in_process") {
      return { ok: false, status: "pending", externalReference };
    }
    if (status === "rejected") {
      return { ok: false, status: "rejected", externalReference };
    }
    if (status === "cancelled") {
      return { ok: false, status: "cancelled", externalReference };
    }

    return { ok: false, status: "unknown", externalReference };
  });
