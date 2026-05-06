import {
  createFileRoute,
  Link,
  notFound,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  useTenant,
  useCart,
  selectStoreBySlug,
  formatBRL,
  normalizeStore,
} from "@/lib/store";
import { createMercadoPagoPreference } from "@/lib/mercadopago";
import { CheckCircle2, CreditCard, Clock } from "lucide-react";

export const Route = createFileRoute("/loja/$slug/checkout")({
  validateSearch: (s: Record<string, unknown>) => ({
    collection_status: s.collection_status as string | undefined,
    external_reference: s.external_reference as string | undefined,
    payment_id: s.payment_id as string | undefined,
  }),
  loader: ({ params }) => {
    const store = selectStoreBySlug(params.slug);
    if (!store) throw notFound();
    return null;
  },
  component: CheckoutPage,
});

const EMPTY_CART: never[] = [];

type CheckoutPaymentMethod = "pix" | "cash" | "credit" | "debit";

const PIX_KEY_TYPE_LABEL: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Telefone",
  random: "Chave aleatória",
};

function getDefaultPaymentMethod(store: ReturnType<typeof normalizeStore>): CheckoutPaymentMethod {
  if (store.payments.pix) return "pix";
  if (store.payments.cash) return "cash";
  if (store.payments.credit) return "credit";
  return "debit";
}

function getDefaultDeliveryMethod(store: ReturnType<typeof normalizeStore>) {
  return (store.delivery.pickup ? "pickup" : "delivery") as "pickup" | "delivery";
}

function CheckoutPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const rawStore = useTenant((s) => s.stores.find((x) => x.slug === slug));
  if (!rawStore) throw notFound();
  const store = normalizeStore(rawStore);
  const cartRaw = useCart((c) => c.carts[slug]);
  const cart = cartRaw ?? EMPTY_CART;
  const clear = useCart((c) => c.clear);
  const createOrder = useTenant((s) => s.createOrder);
  const updateProduct = useTenant((s) => s.updateProduct);
  const products = useTenant((s) => s.products);
  const updateOrderStatus = useTenant((s) => s.updateOrderStatus);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    paymentMethod: getDefaultPaymentMethod(store) as CheckoutPaymentMethod,
    deliveryMethod: getDefaultDeliveryMethod(store),
    deliveryZone: store.delivery.fees[0]?.label ?? "",
    needsChange: false,
    changeFor: "",
  });
  const [done, setDone] = useState(false);
  const [mpLoading, setMpLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<
    "approved" | "pending" | "failed" | null
  >(null);

  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const selectedFee =
    form.deliveryMethod === "delivery"
      ? (store.delivery.fees.find((f) => f.label === form.deliveryZone)?.fee ??
        store.delivery.fee)
      : 0;
  const fee = selectedFee;
  const total = subtotal + fee;
  const changeForValue = Number(form.changeFor);
  const estimatedChange =
    form.paymentMethod === "cash" &&
    form.needsChange &&
    Number.isFinite(changeForValue) &&
    changeForValue > total
      ? changeForValue - total
      : 0;

  // Handle MercadoPago return redirect
  useEffect(() => {
    const status = search.collection_status;
    const ref = search.external_reference;
    if (!status || !ref || !ref.startsWith(`order:${slug}:`)) return;

    const orderId = ref.slice(`order:${slug}:`.length);

    if (status === "approved") {
      updateOrderStatus(orderId, "paid");
      setPaymentStatus("approved");
      setDone(true);
    } else if (status === "pending") {
      setPaymentStatus("pending");
      setDone(true);
    } else {
      setPaymentStatus("failed");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeOrderAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (form.paymentMethod === "cash" && form.needsChange) {
      if (!Number.isFinite(changeForValue) || changeForValue < total) {
        setFormError("Para troco, informe um valor maior ou igual ao total do pedido.");
        return;
      }
    }

    // Create order & get its id
    const orderId = createOrder(store.id, {
      customer: {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      },
      items: cart,
      total,
      paymentMethod: form.paymentMethod,
      deliveryMethod: form.deliveryMethod,
      deliveryZone: form.deliveryMethod === "delivery" ? form.deliveryZone : undefined,
      cashChange:
        form.paymentMethod === "cash"
          ? {
              needsChange: form.needsChange,
              changeFor: form.needsChange && Number.isFinite(changeForValue)
                ? changeForValue
                : null,
              change: form.needsChange ? estimatedChange : 0,
            }
          : undefined,
    });

    // Decrement stock
    cart.forEach((i) => {
      const p = products.find((x) => x.id === i.productId);
      if (p) updateProduct(p.id, { stock: Math.max(0, p.stock - i.quantity) });
    });
    clear(slug);

    setMpLoading(true);
    try {
      const origin = window.location.origin;
      const ref = `order:${slug}:${orderId}`;
      const baseUrl = `${origin}/loja/${slug}/checkout`;

      const result = await createMercadoPagoPreference({
        data: {
          items: cart.map((i) => ({
            title: i.name,
            quantity: i.quantity,
            unit_price: i.price,
          })),
          backUrls: {
            success: `${baseUrl}?collection_status=approved&external_reference=${ref}`,
            failure: `${baseUrl}?collection_status=failure&external_reference=${ref}`,
            pending: `${baseUrl}?collection_status=pending&external_reference=${ref}`,
          },
          externalReference: ref,
        },
      });

      window.location.assign(result.sandboxInitPoint || result.initPoint);
    } catch {
      // MP not configured — fall back to manual confirmation
      setPaymentStatus(null);
      setDone(true);
    } finally {
      setMpLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-md)]">
          {paymentStatus === "approved" ? (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
              <h1 className="mt-3 text-2xl font-bold">Pagamento aprovado!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Seu pagamento foi confirmado. A loja {store.name} já recebeu
                seu pedido.
              </p>
            </>
          ) : paymentStatus === "pending" ? (
            <>
              <Clock className="mx-auto h-14 w-14 text-yellow-500" />
              <h1 className="mt-3 text-2xl font-bold">Pagamento pendente</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Seu pedido foi registrado. O pagamento está sendo processado.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
              <h1 className="mt-3 text-2xl font-bold">Pedido confirmado!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                A loja {store.name} já recebeu seu pedido e entrará em contato.
              </p>
            </>
          )}
          <a
            href={`/loja/${slug}`}
            className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Voltar para a loja
          </a>
        </div>
      </div>
    );
  }

  if (cart.length === 0 && !search.collection_status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <p className="text-muted-foreground">Seu carrinho está vazio.</p>
          <Link
            to="/loja/$slug"
            params={{ slug }}
            className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Ver produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <Link
            to="/loja/$slug"
            params={{ slug }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar para {store.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Finalizar pedido</h1>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={placeOrderAndPay}
          className="space-y-6 rounded-2xl border border-border bg-card p-6"
        >
          <section>
            <h2 className="mb-3 font-semibold">Seus dados</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput
                label="Nome completo"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <FormInput
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <FormInput
                label="WhatsApp"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <FormInput
                label="Endereço"
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Entrega</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {store.delivery.pickup && (
                <RadioCard
                  label="Retirada no local"
                  desc="Combinar pelo WhatsApp"
                  checked={form.deliveryMethod === "pickup"}
                  onSelect={() =>
                    setForm({ ...form, deliveryMethod: "pickup" })
                  }
                />
              )}
              {store.delivery.localDelivery && (
                <RadioCard
                  label="Entrega local"
                  desc={`Taxa a partir de ${formatBRL(store.delivery.fees[0]?.fee ?? store.delivery.fee)}`}
                  checked={form.deliveryMethod === "delivery"}
                  onSelect={() =>
                    setForm({
                      ...form,
                      deliveryMethod: "delivery",
                      deliveryZone: form.deliveryZone || store.delivery.fees[0]?.label || "",
                    })
                  }
                />
              )}
            </div>

            {form.deliveryMethod === "delivery" && store.delivery.fees.length > 0 && (
              <label className="mt-3 flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Area de entrega</span>
                <select
                  value={form.deliveryZone}
                  onChange={(e) => setForm({ ...form, deliveryZone: e.target.value })}
                  className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
                >
                  {store.delivery.fees.map((zone) => (
                    <option key={zone.label} value={zone.label}>
                      {zone.label} - {formatBRL(zone.fee)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Pagamento</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {store.payments.pix && (
                <RadioCard
                  label="Pix"
                  desc="Aprovação imediata"
                  checked={form.paymentMethod === "pix"}
                  onSelect={() =>
                    setForm({
                      ...form,
                      paymentMethod: "pix",
                      needsChange: false,
                      changeFor: "",
                    })
                  }
                />
              )}
              {store.payments.cash && (
                <RadioCard
                  label="Dinheiro"
                  desc="Pagamento na entrega/retirada"
                  checked={form.paymentMethod === "cash"}
                  onSelect={() => setForm({ ...form, paymentMethod: "cash" })}
                />
              )}
              {store.payments.credit && (
                <RadioCard
                  label="Cartao de credito"
                  desc="Pague no cartao"
                  checked={form.paymentMethod === "credit"}
                  onSelect={() =>
                    setForm({
                      ...form,
                      paymentMethod: "credit",
                      needsChange: false,
                      changeFor: "",
                    })
                  }
                />
              )}
              {store.payments.debit && (
                <RadioCard
                  label="Cartao de debito"
                  desc="Pague no cartao"
                  checked={form.paymentMethod === "debit"}
                  onSelect={() =>
                    setForm({
                      ...form,
                      paymentMethod: "debit",
                      needsChange: false,
                      changeFor: "",
                    })
                  }
                />
              )}
            </div>

            {form.paymentMethod === "cash" && (
              <div className="mt-3 space-y-3 rounded-lg border border-border bg-background p-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.needsChange}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        needsChange: e.target.checked,
                        changeFor: e.target.checked ? form.changeFor : "",
                      })
                    }
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Precisa de troco?
                </label>

                {form.needsChange && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <FormInput
                      label="Troco para quanto?"
                      type="number"
                      value={form.changeFor}
                      onChange={(v) => setForm({ ...form, changeFor: v })}
                    />
                    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Troco estimado</span>
                      <p className="mt-1 font-semibold text-foreground">
                        {formatBRL(estimatedChange)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.paymentMethod === "pix" && (store.payments.pixKey || store.payments.pixQrCode) && (
              <div className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
                {store.payments.pixBank && (
                  <p>
                    <span className="font-medium">Banco:</span> {store.payments.pixBank}
                  </p>
                )}
                <p>
                  <span className="font-medium">Tipo da chave:</span>{" "}
                  {PIX_KEY_TYPE_LABEL[store.payments.pixKeyType] ?? "Chave Pix"}
                </p>
                {store.payments.pixKey && (
                  <p>
                    <span className="font-medium">Chave Pix:</span> {store.payments.pixKey}
                  </p>
                )}
                {store.payments.pixReceiverName && (
                  <p>
                    <span className="font-medium">Recebedor:</span> {store.payments.pixReceiverName}
                  </p>
                )}
                {store.payments.pixReceiverDocument && (
                  <p>
                    <span className="font-medium">Documento:</span>{" "}
                    {store.payments.pixReceiverDocument}
                  </p>
                )}
                {store.payments.pixQrCode && (
                  <img
                    src={store.payments.pixQrCode}
                    alt="QR Code Pix"
                    className="h-32 w-32 rounded-md border border-border object-cover"
                  />
                )}
              </div>
            )}
          </section>

          {formError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          {paymentStatus === "failed" && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Pagamento não aprovado. Verifique os dados e tente novamente.
            </p>
          )}

          <button
            disabled={mpLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 py-3 font-semibold text-primary-foreground shadow-[var(--shadow-md)] transition hover:brightness-110 disabled:opacity-70"
          >
            <CreditCard className="h-4 w-4" />
            {mpLoading
              ? "Redirecionando..."
              : `Pagar com MercadoPago • ${formatBRL(total)}`}
          </button>
        </form>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Resumo</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {cart.map((i) => (
              <li key={i.productId} className="flex justify-between py-2">
                <span>
                  {i.quantity}× {i.name}
                </span>
                <span>{formatBRL(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <SummaryRow label="Subtotal" value={formatBRL(subtotal)} />
            <SummaryRow
              label={
                form.deliveryMethod === "delivery" && form.deliveryZone
                  ? `Entrega (${form.deliveryZone})`
                  : "Entrega"
              }
              value={formatBRL(fee)}
            />
            <SummaryRow label="Total" value={formatBRL(total)} bold />
            {form.paymentMethod === "cash" && form.needsChange && (
              <SummaryRow label="Troco estimado" value={formatBRL(estimatedChange)} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function FormInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{props.label}</span>
      <input
        required
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
      />
    </label>
  );
}

function RadioCard({
  label,
  desc,
  checked,
  onSelect,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border p-3 text-left transition ${
        checked
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "text-base font-bold" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
