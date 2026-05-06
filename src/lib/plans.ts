export type Plan = "free" | "start" | "pro" | "full";

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 5,
  start: 30,
  pro: 70,
  full: Infinity,
};

export const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  start: 19.9,
  pro: 39.9,
  full: 89.9,
};

export const PDV_ADDON_PRICE = 50;

export const PLAN_NAMES: Record<Plan, string> = {
  free: "Free",
  start: "Start",
  pro: "Pro",
  full: "Full",
};

export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "Até 5 produtos",
    "Integração com WhatsApp",
    "Controle de estoque manual",
    "Relatórios básicos",
    "Suporte normal",
  ],
  start: [
    "Até 30 produtos",
    "Integração com WhatsApp",
    "Controle de estoque automático",
    "Alertas de estoque baixo",
    "Relatórios básicos",
    "Suporte normal",
  ],
  pro: [
    "Até 70 produtos",
    "Integração com WhatsApp",
    "Controle de estoque automático",
    "Alertas de estoque baixo",
    "Relatórios avançados",
    "Acesso para 2 usuários",
    "Suporte prioritário",
  ],
  full: [
    "Produtos ilimitados",
    "Integração com WhatsApp",
    "Controle de estoque automático",
    "Alertas de estoque baixo",
    "Relatórios avançados",
    "Multiusuário",
    "Suporte prioritário",
  ],
};

export const PLAN_ORDER: Plan[] = ["free", "start", "pro", "full"];

export function isUpgrade(current: Plan, target: Plan) {
  return PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(current);
}

export function getBillingKindFromExternalReference(ref: string): "plan" | "pdv" | null {
  if (/^plan:[a-z]+:/.test(ref)) return "plan";
  if (/^pdv:[a-z]+:/.test(ref)) return "pdv";
  return null;
}

export function getPlanFromExternalReference(ref: string): Plan | null {
  const match = ref.match(/^(?:plan|pdv):([a-z]+):/);
  if (!match) return null;
  const candidate = match[1] as Plan;
  return PLAN_ORDER.includes(candidate) ? candidate : null;
}

export function getStoreIdFromExternalReference(ref: string): string | null {
  const match = ref.match(/^(?:plan|pdv):[a-z]+:(.+)$/);
  return match ? match[1] : null;
}
