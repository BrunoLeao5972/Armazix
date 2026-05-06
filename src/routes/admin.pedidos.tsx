import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTenant, formatBRL, type Order } from "@/lib/store";
import { useCurrentStore } from "./admin";
import {
  Receipt,
  Phone,
  Mail,
  MapPin,
  Truck,
  Store as StoreIcon,
  CreditCard,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/admin/pedidos")({
  component: OrdersPage,
});

const STATUSES: Order["status"][] = ["pending", "paid", "shipped", "delivered"];
const LABEL: Record<Order["status"], string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
};
const STATUS_STYLE: Record<Order["status"], string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  shipped:
    "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  delivered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

type Tab = "all" | Order["status"];

function OrdersPage() {
  const store = useCurrentStore();
  const allOrders = useTenant((s) => s.orders);
  const orders = useMemo(
    () => allOrders.filter((o) => o.storeId === store.id),
    [allOrders, store.id],
  );
  const updateOrderStatus = useTenant((s) => s.updateOrderStatus);
  const [tab, setTab] = useState<Tab>("all");

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: orders.length,
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 0,
    };
    orders.forEach((o) => (c[o.status] += 1));
    return c;
  }, [orders]);

  const totalRevenue = orders
    .filter((o) => o.status !== "pending")
    .reduce((a, o) => a + o.total, 0);
  const avgTicket =
    orders.length > 0
      ? orders.reduce((a, o) => a + o.total, 0) / orders.length
      : 0;

  const filtered = useMemo(() => {
    const list = tab === "all" ? orders : orders.filter((o) => o.status === tab);
    return list.slice().reverse();
  }, [orders, tab]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-8 py-10">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe e atualize o status dos pedidos da sua loja.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total de pedidos" value={String(orders.length)} />
        <Stat label="Receita confirmada" value={formatBRL(totalRevenue)} />
        <Stat label="Ticket médio" value={formatBRL(avgTicket)} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {(["all", ...STATUSES] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "all" ? "Todos" : LABEL[t]}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                tab === t
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 font-medium">
            {orders.length === 0
              ? "Nenhum pedido recebido ainda"
              : "Nenhum pedido nesta categoria"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length === 0
              ? "Compartilhe o link da sua loja para começar a vender."
              : "Ajuste o filtro acima para ver outros pedidos."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onChangeStatus={(s) => updateOrderStatus(o.id, s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-sm)]">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function OrderCard({
  order,
  onChangeStatus,
}: {
  order: Order;
  onChangeStatus: (s: Order["status"]) => void;
}) {
  const itemsCount = order.items.reduce((a, i) => a + i.quantity, 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              #{order.id.slice(0, 6).toUpperCase()}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}
            >
              {LABEL[order.status]}
            </span>
          </div>
          <div className="mt-1 font-semibold">{order.customer.name}</div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(order.createdAt).toLocaleString("pt-BR")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {itemsCount} {itemsCount === 1 ? "item" : "itens"}
          </div>
          <div className="text-xl font-bold">{formatBRL(order.total)}</div>
          <select
            value={order.status}
            onChange={(e) => onChangeStatus(e.target.value as Order["status"])}
            className="mt-2 rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-5 px-5 py-4 md:grid-cols-3">
        {/* Customer */}
        <div className="space-y-2 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">{order.customer.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{order.customer.phone}</span>
          </div>
          {order.customer.address && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{order.customer.address}</span>
            </div>
          )}
        </div>

        {/* Delivery + Payment */}
        <div className="space-y-2 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Entrega & pagamento
          </div>
          <div className="flex items-center gap-2">
            {order.deliveryMethod === "pickup" ? (
              <>
                <StoreIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Retirada na loja
              </>
            ) : (
              <>
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                Entrega
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            {order.paymentMethod.toUpperCase()}
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Itens
          </div>
          <ul className="mt-2 divide-y divide-border text-sm">
            {order.items.map((it) => (
              <li
                key={it.productId}
                className="flex justify-between py-1.5"
              >
                <span className="truncate">
                  {it.quantity}× {it.name}
                </span>
                <span className="text-muted-foreground">
                  {formatBRL(it.price * it.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
