import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { verifyEmailCodeFn, requestEmailVerificationCodeFn } from "@/lib/authFns";
import { useAuth, selectStoreOfUser } from "@/lib/store";

export const Route = createFileRoute("/verificar-email")({
  head: () => ({
    meta: [
      { title: "Verificar e-mail — Armazix" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const setSession = useAuth((s) => s.setSession);

  const [email, setEmail] = useState(search.email || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const result = await verifyEmailCodeFn({ data: { email, code } });
      setSession(result.userId, result.name, result.sessionToken);
      const store = selectStoreOfUser(result.userId);
      navigate({ to: store ? "/admin" : "/onboarding" });
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel verificar o e-mail.");
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setSending(true);
    setErr("");
    setOk("");

    try {
      await requestEmailVerificationCodeFn({ data: { email } });
      setOk("Enviamos um novo codigo para seu e-mail.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel reenviar o codigo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
      <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Verifique seu e-mail</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Digite o codigo de 6 digitos que enviamos para continuar.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              E-mail
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Codigo
            </label>
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm tracking-[0.3em]"
              placeholder="000000"
            />
          </div>

          {err && <p className="text-xs font-semibold text-destructive">{err}</p>}
          {ok && <p className="text-xs font-semibold text-emerald-600">{ok}</p>}

          <button
            disabled={loading}
            className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Verificando..." : "Verificar e entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={resendCode}
          disabled={sending}
          className="mt-4 text-xs font-bold uppercase tracking-wide text-primary disabled:opacity-60"
        >
          {sending ? "Reenviando..." : "Reenviar codigo"}
        </button>
      </section>
    </main>
  );
}
