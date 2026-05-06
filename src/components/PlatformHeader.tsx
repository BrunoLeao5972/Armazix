import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/store";
import ArmazixLogo from "@/assets/Armazix-logo.png";

export function PlatformHeader() {
  const { currentUserId, users, logout } = useAuth();
  const user = users.find((u) => u.id === currentUserId) ?? null;
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center font-semibold">
          <img
            src={ArmazixLogo}
            alt="Armazix"
            className="h-12 w-auto object-contain"
          />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link
                to="/admin"
                className="rounded-md px-3 py-2 text-foreground hover:bg-muted"
              >
                Painel
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
                className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-foreground hover:bg-muted"
              >
                Entrar
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                Criar loja grátis
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
