import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { requestPasswordResetCodeFn, resetPasswordWithCodeFn } from "@/lib/authFns";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Armazix" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RecoverPasswordPage,
});

function RecoverPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);

    try {
      await requestPasswordResetCodeFn({ data: { email } });
      setStep("reset");
      setOk("Se o e-mail existir, enviamos um codigo de recuperacao.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel enviar o codigo.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);

    try {
      await resetPasswordWithCodeFn({
        data: {
          email,
          code,
          newPassword,
        },
      });
      setOk("Senha redefinida com sucesso. Faça login novamente.");
      navigate({ to: "/login" });
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
      <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Recuperar senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "request"
            ? "Informe seu e-mail para receber o codigo de recuperacao."
            : "Digite o codigo recebido e escolha uma nova senha."}
        </p>

        {step === "request" ? (
          <form onSubmit={requestCode} className="mt-6 space-y-4">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              placeholder="seu@email.com"
            />

            {err && <p className="text-xs font-semibold text-destructive">{err}</p>}
            {ok && <p className="text-xs font-semibold text-emerald-600">{ok}</p>}

            <button
              disabled={loading}
              className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar codigo"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="mt-6 space-y-4">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              placeholder="seu@email.com"
            />
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm tracking-[0.3em]"
              placeholder="Codigo de 6 digitos"
            />
            <input
              required
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              placeholder="Nova senha"
            />

            {err && <p className="text-xs font-semibold text-destructive">{err}</p>}
            {ok && <p className="text-xs font-semibold text-emerald-600">{ok}</p>}

            <button
              disabled={loading}
              className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Redefinir senha"}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-4 inline-block text-xs font-bold uppercase tracking-wide text-primary">
          Voltar para login
        </Link>
      </section>
    </main>
  );
}
