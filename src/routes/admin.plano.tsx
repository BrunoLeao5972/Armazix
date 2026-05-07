import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useTenant } from "@/lib/store";
import {
  PDV_ADDON_PRICE,
  PLAN_FEATURES,
  PLAN_LIMITS,
  PLAN_NAMES,
  PLAN_ORDER,
  PLAN_PRICES,
  type Plan,
  getBillingKindFromExternalReference,
  getStoreIdFromExternalReference,
  getPlanFromExternalReference,
  isUpgrade,
} from "@/lib/plans";
import { createMercadoPagoPreference, verifyMercadoPagoPayment } from "@/lib/mercadopago";
import {
  Check,
  Crown,
  Zap,
  Star,
  Sparkles,
  ArrowRight,
  Package,
  Lock,
  Monitor,
} from "lucide-react";
import { formatBRL } from "@/lib/store";

export const Route = createFileRoute("/admin/plano")({
  validateSearch: (s: Record<string, unknown>) => ({
    collection_status: s.collection_status as string | undefined,
    external_reference: s.external_reference as string | undefined,
    payment_id: s.payment_id as string | undefined,
  }),
  component: PlanoPage,
});

function PlanoPage() {
  const userId = useAuth((s) => s.currentUserId);
  const store = useTenant((s) =>
    s.stores.find((x) => x.ownerId === userId),
  );
  const allProducts = useTenant((s) => s.products);
  const search = useSearch({ from: "/admin/plano" });
  const storeId = store?.id ?? null;
  const products = useMemo(
    () => (storeId ? allProducts.filter((p) => p.storeId === storeId) : []),
    [allProducts, storeId],
  );
  const currentPlan: Plan = store?.plan ?? "free";
  const limit = PLAN_LIMITS[currentPlan];
  const count = products.length;
  const pct = limit === Infinity ? 0 : Math.min(100, (count / limit) * 100);

  const [loading, setLoading] = useState<Plan | "pdv" | null>(null);
  const [err, setErr] = useState("");
  const [activated, setActivated] = useState<
    { type: "plan"; plan: Plan } | { type: "pdv" } | null
  >(null);
  const processedPaymentRef = useRef<string | null>(null);
  const hasPdvAccess = !!store?.pdvAccess;
  const pdvBlockedByPlan = currentPlan === "free";

  // Handle return from MercadoPago after payment
  useEffect(() => {
    if (!storeId) return;
    if (
      search.collection_status !== "approved" ||
      !search.external_reference ||
      !search.payment_id
    ) {
      return;
    }

    if (processedPaymentRef.current === search.external_reference) {
      return;
    }

    const run = async () => {
      const verification = await verifyMercadoPagoPayment({
        data: {
          paymentId: search.payment_id!,
          expectedExternalReference: search.external_reference,
        },
      });

      if (!verification.ok || verification.status !== "approved") {
        return;
      }

      const billingKind = getBillingKindFromExternalReference(
        search.external_reference!,
      );
      const plan = getPlanFromExternalReference(search.external_reference!);
      const refStoreId = getStoreIdFromExternalReference(search.external_reference!);
      if (!billingKind || !plan || refStoreId !== storeId) {
        return;
      }

      processedPaymentRef.current = search.external_reference!;

      if (billingKind === "plan") {
        if (currentPlan !== plan) {
          useTenant.getState().upgradePlan(storeId, plan);
        }
        setActivated((prev) =>
          prev?.type === "plan" && prev.plan === plan
            ? prev
            : { type: "plan", plan },
        );
      }

      if (billingKind === "pdv" && currentPlan !== "free") {
        useTenant.getState().updateStore(storeId, {
          pdvAccess: true,
          pdvEnabled: true,
        });
        setActivated((prev) => (prev?.type === "pdv" ? prev : { type: "pdv" }));
      }

      // Clean URL params once so the activation flow does not run repeatedly.
      // Use history.replaceState to avoid router state churn inside this effect.
      window.history.replaceState({}, "", "/admin/plano");
    };

    void run();
  }, [
    currentPlan,
    search.collection_status,
    search.external_reference,
    search.payment_id,
    storeId,
  ]);

  const handleUpgrade = async (target: Plan) => {
    if (target === currentPlan) return;
    setErr("");
    setLoading(target);
    try {
      const origin = window.location.origin;
      const ref = `plan:${target}:${store!.id}`;
      const result = await createMercadoPagoPreference({
        data: {
          items: [
            {
              title: `Armazix — Plano ${PLAN_NAMES[target]}`,
              quantity: 1,
              unit_price: PLAN_PRICES[target],
            },
          ],
          backUrls: {
            success: `${origin}/admin/plano`,
            failure: `${origin}/admin/plano`,
            pending: `${origin}/admin/plano`,
          },
          externalReference: ref,
        },
      });
      // In production use result.initPoint; in sandbox use result.sandboxInitPoint
      window.location.assign(result.sandboxInitPoint || result.initPoint);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "Erro ao conectar ao MercadoPago.",
      );
    } finally {
      setLoading(null);
    }
  };

  const handleEnablePdv = async () => {
    if (!store || pdvBlockedByPlan || hasPdvAccess) return;

    setErr("");
    setLoading("pdv");
    try {
      const origin = window.location.origin;
      const ref = `pdv:${currentPlan}:${store.id}`;
      const result = await createMercadoPagoPreference({
        data: {
          items: [
            {
              title: `Armazix — Adicional PDV (${PLAN_NAMES[currentPlan]})`,
              quantity: 1,
              unit_price: PDV_ADDON_PRICE,
            },
          ],
          backUrls: {
            success: `${origin}/admin/plano`,
            failure: `${origin}/admin/plano`,
            pending: `${origin}/admin/plano`,
          },
          externalReference: ref,
        },
      });

      window.location.assign(result.sandboxInitPoint || result.initPoint);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "Erro ao conectar ao MercadoPago.",
      );
    } finally {
      setLoading(null);
    }
  };

  if (!store) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-8 py-10">
        <h1 className="text-2xl font-bold">Meu Plano</h1>
        <p className="text-sm text-muted-foreground">
          Carregando dados da loja para exibir seus planos...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-8 py-10">
      <header>
        <h1 className="text-2xl font-bold">Meu Plano</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie sua assinatura e veja os limites do seu plano atual.
        </p>
      </header>

      {/* Activation success banner */}
      {activated && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4">
          <Check className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-primary">
              {activated.type === "plan"
                ? `Plano ${PLAN_NAMES[activated.plan]} ativado!`
                : "Adicional PDV ativado!"}
            </p>
            <p className="text-xs text-muted-foreground">
              Pagamento confirmado pelo MercadoPago.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {err && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Plano atual
              </p>
              <p className="text-xl font-bold">
                {PLAN_NAMES[currentPlan]}
                {currentPlan === "free" && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    Grátis
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {currentPlan === "free"
                ? "R$ 0"
                : formatBRL(PLAN_PRICES[currentPlan])}
            </p>
            {currentPlan !== "free" && (
              <p className="text-xs text-muted-foreground">/mês</p>
            )}
          </div>
        </div>

        {/* Usage bar */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Produtos cadastrados
            </span>
            <span className="font-semibold">
              {count}
              <span className="font-normal text-muted-foreground">
                {" "}/ {limit === Infinity ? "∞" : limit}
              </span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 100
                  ? "bg-destructive"
                  : pct >= 80
                    ? "bg-yellow-500"
                    : "bg-[image:var(--gradient-primary)]"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct >= 80 && pct < 100 && (
            <p className="mt-1.5 text-xs text-yellow-600 dark:text-yellow-400">
              Você está quase no limite! Considere fazer upgrade.
            </p>
          )}
          {pct >= 100 && (
            <p className="mt-1.5 text-xs text-destructive">
              Limite atingido. Faça upgrade para adicionar mais produtos.
            </p>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div>
        <h2 className="mb-4 font-semibold">Escolha um plano</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((plan) => {
            const isCurrent = plan === currentPlan;
            const upgrade = isUpgrade(currentPlan, plan);
            const isFeatured = plan === "pro";
            const isPremium = plan === "full";

            return (
              <div
                key={plan}
                className={`relative flex flex-col rounded-2xl border p-5 transition ${
                  isCurrent
                    ? "border-primary/60 bg-primary/5"
                    : isFeatured
                      ? "border-primary/40 bg-card shadow-[var(--shadow-md)]"
                      : "border-border bg-card"
                }`}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[image:var(--gradient-primary)] px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Mais popular
                  </span>
                )}
                {isPremium && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-xs font-semibold text-background">
                    Premium
                  </span>
                )}

                <div className="mb-3 flex items-center gap-2">
                  <PlanIcon plan={plan} />
                  <span className="font-semibold">{PLAN_NAMES[plan]}</span>
                  {isCurrent && (
                    <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      Atual
                    </span>
                  )}
                </div>

                <p className="text-2xl font-bold">
                  {plan === "free" ? "R$ 0" : formatBRL(PLAN_PRICES[plan])}
                  {plan !== "free" && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /mês
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {PLAN_LIMITS[plan] === Infinity
                    ? "Produtos ilimitados"
                    : `Até ${PLAN_LIMITS[plan]} produtos`}
                </p>

                <ul className="my-4 flex-1 space-y-1.5">
                  {PLAN_FEATURES[plan].map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || !upgrade || loading !== null}
                  onClick={() => handleUpgrade(plan)}
                  className={`mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isCurrent
                      ? "cursor-default bg-primary/10 text-primary"
                      : upgrade
                        ? "bg-[image:var(--gradient-primary)] text-primary-foreground hover:brightness-110 disabled:opacity-70"
                        : "cursor-not-allowed bg-muted text-muted-foreground"
                  }`}
                >
                  {loading === plan ? (
                    "Aguarde..."
                  ) : isCurrent ? (
                    "Plano ativo"
                  ) : upgrade ? (
                    <>
                      Fazer upgrade <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    "Plano inferior"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Monitor className="h-3.5 w-3.5" /> Adicional
            </div>
            <h2 className="text-lg font-bold">PDV para loja fisica</h2>
            <p className="text-sm text-muted-foreground">
              Libere a opcao de PDV no painel para operar vendas no caixa.
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold">{formatBRL(PDV_ADDON_PRICE)}</p>
            <p className="text-xs text-muted-foreground">/mês adicional</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {pdvBlockedByPlan ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-400">
              <Lock className="h-3.5 w-3.5" /> Disponivel apenas nos planos pagos
            </span>
          ) : hasPdvAccess ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Check className="h-3.5 w-3.5" /> PDV liberado para esta loja
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-muted-foreground/30 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> PDV bloqueado ate pagamento do adicional
            </span>
          )}

          <button
            disabled={pdvBlockedByPlan || hasPdvAccess || loading !== null}
            onClick={handleEnablePdv}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "pdv"
              ? "Aguarde..."
              : hasPdvAccess
                ? "PDV ativo"
                : "Contratar adicional PDV"}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Pagamentos processados com segurança pelo{" "}
        <span className="font-medium text-foreground">MercadoPago</span>.
        Cancele a qualquer momento.
      </p>
    </div>
  );
}

function PlanIcon({ plan }: { plan: Plan }) {
  const cls = "h-4 w-4";
  if (plan === "free") return <Package className={cls} />;
  if (plan === "start") return <Zap className={cls} />;
  if (plan === "pro") return <Star className={cls} />;
  return <Sparkles className={cls} />;
}
