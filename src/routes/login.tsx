import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, selectStoreOfUser } from "@/lib/store";
import { PlatformHeader } from "@/components/PlatformHeader";
import { 
  ArrowRight, 
  Lock, 
  Mail, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ChevronLeft
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

function hasPersistedStoreForUser(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("ms-tenant");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      state?: { stores?: Array<{ ownerId?: string }> };
    };
    const stores = Array.isArray(parsed?.state?.stores) ? parsed.state.stores : [];
    return stores.some((store) => store.ownerId === userId);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    // Session is localStorage-based, so only check on client.
    if (typeof window === "undefined") return;

    const userId = useAuth.getState().currentUserId ?? readPersistedUserId();
    if (!userId) return;

    const hasStore = !!selectStoreOfUser(userId) || hasPersistedStoreForUser(userId);
    throw redirect({ to: hasStore ? "/admin" : "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Entrar — Armazix" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    
    setTimeout(() => {
      const res = login(form.email, form.password);
      if (res.ok) {
        const store = selectStoreOfUser(res.userId);
        navigate({ to: store ? "/admin" : "/onboarding" });
      } else {
        setErr(res.error);
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10 selection:text-primary">
      <PlatformHeader />
      
      <main className="relative flex flex-1 items-center justify-center p-6">
        {/* Background Decorations */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-primary-glow/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-2xl lg:flex">
          {/* Left Side: Hero Info */}
          <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-glow opacity-90" />
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] bg-[length:24px_24px]" />
            
            <div className="relative z-10">
              <Link to="/" className="inline-flex items-center gap-2 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
                  <ChevronLeft className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold uppercase tracking-widest">Voltar ao início</span>
              </Link>

              <div className="mt-20">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest backdrop-blur-md mb-6">
                  <Sparkles className="h-3.5 w-3.5" /> Área do Lojista
                </div>
                <h2 className="text-5xl font-black leading-tight tracking-tight">
                  Bem-vindo de <br />volta ao <span className="text-white/80">futuro.</span>
                </h2>
                <p className="mt-6 text-lg text-primary-foreground/80 leading-relaxed">
                  Acesse seu painel para gerenciar produtos, acompanhar pedidos e ver seu negócio crescer em tempo real.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-12 grid grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="h-6 w-6 mb-3 opacity-80" />
                <p className="text-xs font-black uppercase tracking-widest mb-1">Segurança</p>
                <p className="text-[10px] opacity-60">Dados protegidos de ponta a ponta</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm border border-white/10">
                <Zap className="h-6 w-6 mb-3 opacity-80" />
                <p className="text-xs font-black uppercase tracking-widest mb-1">Velocidade</p>
                <p className="text-[10px] opacity-60">Interface otimizada para produtividade</p>
              </div>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="flex-1 p-8 sm:p-12 lg:p-16">
            <div className="mx-auto max-w-sm">
              <div className="mb-10 text-center lg:text-left">
                <div className="mx-auto lg:mx-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
                  <Lock className="h-7 w-7" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-foreground">Acesse sua conta</h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  Insira suas credenciais para entrar no painel administrativo.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    E-mail
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="h-14 w-full rounded-2xl border border-border bg-muted/30 pl-12 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-4 focus:ring-primary/5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Senha
                    </label>
                    <a href="#" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                      Esqueceu a senha?
                    </a>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      required
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="h-14 w-full rounded-2xl border border-border bg-muted/30 pl-12 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-4 focus:ring-primary/5"
                    />
                  </div>
                </div>

                {err && (
                  <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs font-bold text-destructive flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    {err}
                  </div>
                )}

                <button
                  disabled={loading}
                  className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary font-black uppercase tracking-widest text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      Entrar no Painel
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-10 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Ainda não tem uma loja?{" "}
                  <Link
                    to="/signup"
                    className="font-black text-primary hover:underline"
                  >
                    Criar conta grátis
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>

      <footer className="shrink-0 pb-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
          © {new Date().getFullYear()} Armazix Platform • Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
