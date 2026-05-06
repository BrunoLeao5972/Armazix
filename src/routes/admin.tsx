import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  useAuth,
  useTenant,
  selectStoreOfUser,
  selectProductsOfStore,
  selectOrdersOfStore,
  type Store,
} from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { getPublicStoreUrl } from "@/lib/domain";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Store as StoreIcon,
  LogOut,
  ExternalLink,
  Crown,
  Search,
  Bell,
  User,
  ChevronRight,
  Tags,
  Users,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

function readPersistedUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("ms-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { currentUserId?: string | null };
    };
    return parsed?.state?.currentUserId ?? null;
  } catch {
    return null;
  }
}

function readPersistedStoreOfUser(userId: string): Store | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("ms-tenant");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { stores?: Store[] };
    };
    const stores = Array.isArray(parsed?.state?.stores) ? parsed.state.stores : [];
    return stores.find((store) => store.ownerId === userId) ?? null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    // Session is persisted in localStorage, so SSR cannot validate it.
    if (typeof window === "undefined") return;

    const userId = useAuth.getState().currentUserId ?? readPersistedUserId();
    if (!userId) throw redirect({ to: "/login" });

    const storeFromState = selectStoreOfUser(userId);
    const storeFromPersist = readPersistedStoreOfUser(userId);
    if (!storeFromState && !storeFromPersist) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(true);
  const authHydrated = useAuth.persist?.hasHydrated() ?? true;
  const tenantHydrated = useTenant.persist?.hasHydrated() ?? true;
  const userId = useAuth((s) => s.currentUserId);
  const logout = useAuth((s) => s.logout);
  // Use specific selectors to avoid re-renders when other store properties change
  const storeId = useTenant((s) =>
    userId ? s.stores.find((x) => x.ownerId === userId)?.id : null,
  );
  const storeName = useTenant((s) =>
    userId ? s.stores.find((x) => x.ownerId === userId)?.name : null,
  );
  const storePlan = useTenant((s) =>
    userId ? s.stores.find((x) => x.ownerId === userId)?.plan : null,
  );
  const storeSlug = useTenant((s) =>
    userId ? s.stores.find((x) => x.ownerId === userId)?.slug : null,
  );
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = window.localStorage.getItem("admin-sidebar-collapsed");
    if (persisted === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("admin-sidebar-collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const cadastrosContext =
    path.startsWith("/admin/cadastros") ||
    path.startsWith("/admin/produtos") ||
    path.startsWith("/admin/clientes") ||
    path.startsWith("/admin/usuarios");

  useEffect(() => {
    if (cadastrosContext) {
      setCadastrosOpen(true);
    }
  }, [cadastrosContext]);

  if (!authHydrated || !tenantHydrated || !userId || !storeId || !storeName || !storeSlug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6 text-sm text-muted-foreground dark:bg-background">
        Carregando painel...
      </div>
    );
  }

  const items = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/pedidos", label: "Pedidos", icon: Receipt },
    { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
    { to: "/admin/plano", label: "Assinatura", icon: Crown },
  ];

  const cadastroItems = [
    {
      to: "/admin/clientes",
      label: "Clientes",
      icon: Users,
      isActive: path.startsWith("/admin/clientes"),
    },
    {
      to: "/admin/produtos",
      label: "Cadastro de Produtos",
      icon: Package,
      isActive: path.startsWith("/admin/produtos"),
    },
    {
      to: "/admin/usuarios",
      label: "Usuários",
      icon: User,
      isActive: path.startsWith("/admin/usuarios"),
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F9FAFB] dark:bg-background">
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-border bg-card transition-all duration-300 lg:static lg:block ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo Area */}
          <div className={`flex h-16 items-center ${sidebarCollapsed ? "px-3" : "px-6"}`}>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                <StoreIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className={`text-xl font-black tracking-tight text-foreground ${sidebarCollapsed ? "hidden" : "block"}`}>
                Armazix
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className={`ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
                sidebarCollapsed ? "mr-0" : "mr-0"
              }`}
              title={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>

          {/* Store Switcher/Info */}
          <div className={`${sidebarCollapsed ? "px-3 py-3" : "px-4 py-4"}`}>
            <div className={`group relative flex items-center rounded-xl border border-border bg-muted/50 transition-colors hover:bg-muted ${sidebarCollapsed ? "justify-center p-2" : "gap-3 p-3"}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background font-bold text-primary shadow-sm">
                {storeName.charAt(0)}
              </div>
              <div className={`min-w-0 flex-1 ${sidebarCollapsed ? "hidden" : "block"}`}>
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{storeName}</p>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary whitespace-nowrap">
                    {storePlan}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 space-y-1 ${sidebarCollapsed ? "px-2 py-3" : "px-3 py-4"}`}>
            {items.map((it) => {
              const active = it.exact ? path === it.to : (it as { isActive?: boolean }).isActive ?? path.startsWith(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to as never}
                  className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${sidebarCollapsed ? "justify-center" : "gap-3"} ${
                    active
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title={it.label}
                >
                  <it.icon className={`h-5 w-5 transition-colors ${active ? "text-primary" : "group-hover:text-foreground"}`} />
                  <span className={sidebarCollapsed ? "hidden" : "block"}>{it.label}</span>
                  {active && !sidebarCollapsed && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}

            <div className={`pt-3 ${sidebarCollapsed ? "hidden" : "block"}`}>
              <button
                type="button"
                onClick={() => setCadastrosOpen((prev) => !prev)}
                className="mb-2 flex w-full items-center gap-2 rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted/70"
              >
                <Tags className="h-3.5 w-3.5" />
                Cadastros
                <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${cadastrosOpen ? "rotate-180" : "rotate-0"}`} />
              </button>
              <div className={`space-y-1 overflow-hidden transition-all ${cadastrosOpen ? "max-h-80" : "max-h-0"}`}>
                {cadastroItems.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to as never}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      it.isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <it.icon className={`h-5 w-5 transition-colors ${it.isActive ? "text-primary" : "group-hover:text-foreground"}`} />
                    {it.label}
                    {it.isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Footer Navigation */}
          <div className={`mt-auto border-t border-border ${sidebarCollapsed ? "p-2" : "p-4"}`}>
            <a
              href={getPublicStoreUrl(storeSlug)}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary ${
                sidebarCollapsed ? "justify-center" : "gap-3"
              }`}
              title="Ver Loja Pública"
            >
              <ExternalLink className="h-5 w-5" />
              <span className={sidebarCollapsed ? "hidden" : "block"}>Ver Loja Pública</span>
            </a>
            <button
              onClick={logout}
              className={`mt-1 flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive ${
                sidebarCollapsed ? "justify-center" : "gap-3"
              }`}
              title="Sair da Conta"
            >
              <LogOut className="h-5 w-5" />
              <span className={sidebarCollapsed ? "hidden" : "block"}>Sair da Conta</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/80 px-8 backdrop-blur-md">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar pedidos, produtos..."
                className="h-10 w-full rounded-full border border-border bg-muted/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-4 focus:ring-primary/5"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="hidden text-right lg:block">
                <p className="text-xs font-bold text-foreground">Admin</p>
                <p className="text-[10px] font-medium text-muted-foreground">online</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-background shadow-sm">
                <User className="h-5 w-5" />
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-background p-8 scroll-smooth">
          <div key={path} className="admin-content-transition mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function useCurrentStore() {
  const userId = useAuth((s) => s.currentUserId);
  const stores = useTenant(useShallow((s) => s.stores));
  return useMemo(
    () => (userId ? stores.find((x) => x.ownerId === userId) : null)!,
    [stores, userId],
  );
}
export { selectProductsOfStore, selectOrdersOfStore };
