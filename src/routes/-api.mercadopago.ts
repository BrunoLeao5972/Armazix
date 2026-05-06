import { createServerFn } from "@tanstack/react-start";
import type { CreatePreferenceInput, PreferenceResult } from "@/lib/mercadopago";

export const createMercadoPagoPreferenceFn = createServerFn({ method: "POST" })
  .inputValidator((input: CreatePreferenceInput) => input)
  .handler(async ({ data }): Promise<PreferenceResult> => {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!token) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado no servidor.");
    }

    const preference = {
      items: data.items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: i.currency_id ?? "BRL",
      })),
      back_urls: {
        success: data.backUrls.success,
        failure: data.backUrls.failure,
        pending: data.backUrls.pending,
      },
      auto_return: "approved",
      external_reference: data.externalReference,
      ...(data.notificationUrl
        ? { notification_url: data.notificationUrl }
        : {}),
    };

    const res = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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
