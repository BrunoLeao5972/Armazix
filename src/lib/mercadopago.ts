// Server function — the actual MercadoPago API call happens on the server
// so the access token is never exposed to the browser.

export type MPItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

export type CreatePreferenceInput = {
  items: MPItem[];
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
  externalReference: string;
  notificationUrl?: string;
};

export type PreferenceResult = {
  id: string;
  initPoint: string;
  sandboxInitPoint: string;
};

export { createMercadoPagoPreferenceFn as createMercadoPagoPreference } from "@/routes/-api.mercadopago";
