import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import {
  useAuth,
  useTenant,
  selectStoreOfUser,
  selectProductsOfStore,
  selectOrdersOfStore,
  type Store,
} from "@/lib/store";
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
  const authHydrated = useAuth.persist?.hasHydrated() ?? true;
  const tenantHydrated = useTenant.persist?.hasHydrated() ?? true;
  const userId = useAuth((s) => s.currentUserId);
  const logout = useAuth((s) => s.logout);
  const storeFromState = useTenant((s) =>
    userId ? s.stores.find((x) => x.ownerId === userId) : null,
  );
  const store = storeFromState;
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (!authHydrated || !tenantHydrated || !userId || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6 text-sm text-muted-foreground dark:bg-background">
        Carregando painel...
      </div>
    );
  }

  const items = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/produtos", label: "Produtos", icon: Package },
    { to: "/admin/pedidos", label: "Pedidos", icon: Receipt },
    { to: "/admin/cadastros", label: "Cadastros", icon: Tags },
    { to: "/admin/plano", label: "Assinatura", icon: Crown },
    { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#F9FAFB] dark:bg-background">
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transition-all duration-300 lg:static lg:block">
        <div className="flex h-full flex-col">
          {/* Logo Area */}
          <div className="flex h-16 items-center px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                <StoreIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-black tracking-tight text-foreground">
                Armazix
              </span>
            </Link>
          </div>

          {/* Store Switcher/Info */}
          <div className="px-4 py-4">
            <div className="group relative flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3 transition-colors hover:bg-muted">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background font-bold text-primary shadow-sm">
                {store.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{store.name}</p>
                <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Plano {store.plan}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {items.map((it) => {
              const active = it.exact ? path === it.to : path.startsWith(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to as "/admin"}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <it.icon className={`h-5 w-5 transition-colors ${active ? "text-primary" : "group-hover:text-foreground"}`} />
                  {it.label}
                  {active && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer Navigation */}
          <div className="mt-auto border-t border-border p-4">
            <a
              href={getPublicStoreUrl(store.slug)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
            >
              <ExternalLink className="h-5 w-5" />
              Ver Loja Pública
            </a>
            <button
              onClick={logout}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              Sair da Conta
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
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function useCurrentStore() {
  const userId = useAuth((s) => s.currentUserId);
  return useTenant((s) =>
    userId ? s.stores.find((x) => x.ownerId === userId) : null,
  )!;
}
export { selectProductsOfStore, selectOrdersOfStore };
