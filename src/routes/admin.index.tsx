import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTenant, formatBRL } from "@/lib/store";
import { getPublicStoreUrl } from "@/lib/domain";
import { useCurrentStore } from "./admin";
import { 
  Copy, 
  Check, 
  ShoppingBag, 
  Package, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  Users,
  Calendar,
  ChevronRight,
  Settings,
  Crown,
  MessageCircle,
  Camera,
  Share2
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const store = useCurrentStore();
  const allProducts = useTenant((s) => s.products);
  const allOrders = useTenant((s) => s.orders);
  const products = useMemo(
    () => allProducts.filter((p) => p.storeId === store.id),
    [allProducts, store.id],
  );
  const orders = useMemo(
    () => allOrders.filter((o) => o.storeId === store.id),
    [allOrders, store.id],
  );
  const revenue = orders.reduce((acc, o) => acc + o.total, 0);

  const [copied, setCopied] = useState(false);
  const url = getPublicStoreUrl(store.slug);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Visão Geral
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta, <span className="font-bold text-foreground">{store.name}</span>. Aqui está o resumo do seu negócio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          icon={DollarSign} 
          label="Receita Total" 
          value={formatBRL(revenue)} 
          trend="+12.5%" 
          color="primary"
        />
        <StatCard 
          icon={ShoppingBag} 
          label="Pedidos" 
          value={String(orders.length)} 
          trend="+5.2%" 
          color="blue"
        />
        <StatCard 
          icon={Package} 
          label="Produtos" 
          value={String(products.length)} 
          color="purple"
        />
        <StatCard 
          icon={Users} 
          label="Clientes" 
          value={String(new Set(orders.map(o => o.customer.email)).size)} 
          trend="+2" 
          color="green"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Store Link Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
            <div className="bg-primary/5 px-8 py-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Sua Loja está Online</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pronta para receber pedidos</p>
                  </div>
                </div>
                <div className="flex h-2 w-2 animate-pulse rounded-full bg-green-500" />
              </div>
            </div>
            <div className="p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1 overflow-hidden rounded-xl border border-border bg-muted/30 px-4 py-3 font-mono text-sm text-muted-foreground">
                  <span className="truncate block">{url}</span>
                </div>
                <button
                  onClick={copy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copiar Link
                    </>
                  )}
                </button>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-green-500 text-white">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-pink-500 text-white">
                    <Camera className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-blue-600 text-white">
                    <Share2 className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span>Compartilhe para começar a vender hoje!</span>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="rounded-3xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between px-8 py-6 border-b border-border/50">
              <h2 className="font-bold text-lg">Últimos Pedidos</h2>
              <Link to="/admin/pedidos" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="p-0">
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-bold text-foreground">Nenhum pedido ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Divulgue seu link e acompanhe suas vendas por aqui.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Data</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="px-8 py-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {orders
                        .slice(-5)
                        .reverse()
                        .map((o) => (
                          <tr key={o.id} className="group transition-colors hover:bg-muted/30">
                            <td className="px-8 py-4">
                              <div className="font-bold text-foreground">{o.customer.name}</div>
                              <div className="text-xs text-muted-foreground">{o.customer.phone}</div>
                            </td>
                            <td className="px-8 py-4 text-sm text-muted-foreground">
                              {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-8 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                o.status === 'paid' || o.status === 'delivered' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-right font-bold text-foreground">
                              {formatBRL(o.total)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar/Quick Actions */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <h3 className="font-bold text-lg mb-6">Ações Rápidas</h3>
            <div className="grid gap-3">
              <Link 
                to="/admin/produtos" 
                className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-muted/30 transition-all hover:border-primary/30 hover:bg-primary/5 group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border group-hover:border-primary/20 transition-colors">
                  <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Novo Produto</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Adicionar ao catálogo</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              
              <Link 
                to="/admin/configuracoes" 
                className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-muted/30 transition-all hover:border-primary/30 hover:bg-primary/5 group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border group-hover:border-primary/20 transition-colors">
                  <Settings className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Configurações</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Ajustar detalhes da loja</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-primary/10 bg-gradient-to-br from-primary to-primary-glow p-8 text-primary-foreground shadow-lg shadow-primary/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 mb-6">
              <Crown className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black mb-2 tracking-tight">Potencialize suas vendas</h3>
            <p className="text-sm text-primary-foreground/80 mb-6 leading-relaxed">
              Desbloqueie produtos ilimitados, relatórios avançados e suporte prioritário.
            </p>
            <Link 
              to="/admin/plano"
              search={{ collection_status: undefined, external_reference: undefined, payment_id: undefined }}
              className="inline-flex w-full items-center justify-center rounded-xl bg-white py-3 text-sm font-bold text-primary shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Fazer Upgrade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = "primary"
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend?: string;
  color?: "primary" | "blue" | "purple" | "green";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    purple: "bg-purple-500/10 text-purple-600",
    green: "bg-green-500/10 text-green-600",
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]} transition-transform group-hover:scale-110`}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <TrendingUp className="h-3 w-3" /> {trend}
          </span>
        )}
      </div>
      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black tracking-tight text-foreground">{value}</p>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-0 bg-current opacity-20 transition-all duration-500 group-hover:w-full ${colors[color].split(' ')[1]}`} />
    </div>
  );
}
