import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { PlatformHeader } from "@/components/PlatformHeader";
import { useAuth, useTenant, selectStoreOfUser } from "@/lib/store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Criar loja — Armazix" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: () => {
    const userId = useAuth.getState().currentUserId;
    if (!userId) throw redirect({ to: "/login" });
    if (selectStoreOfUser(userId)) throw redirect({ to: "/admin" });
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const userId = useAuth((s) => s.currentUserId)!;
  const attachStore = useAuth((s) => s.attachStore);
  const createStore = useTenant((s) => s.createStore);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [err, setErr] = useState("");

  const slugify = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const r = createStore(userId, form);
    if (!r.ok) return setErr(r.error);
    attachStore(userId, r.storeId);
    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader />
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="text-3xl font-bold">Crie sua loja</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha um nome e o link público da sua loja.
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Nome da loja</span>
            <input
              required
              value={form.name}
              onChange={(e) =>
                setForm((prev) => {
                  const nextName = e.target.value;
                  const previousAutoSlug = slugify(prev.name);
                  const shouldSyncSlug = !prev.slug || prev.slug === previousAutoSlug;

                  return {
                    ...prev,
                    name: nextName,
                    slug: shouldSyncSlug ? slugify(nextName) : prev.slug,
                  };
                })
              }
              className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Link da loja</span>
            <div className="flex items-center rounded-md border border-input bg-background pl-3">
              <span className="text-sm text-muted-foreground">/loja/</span>
              <input
                required
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: slugify(e.target.value) })
                }
                className="flex-1 bg-transparent px-2 py-2 outline-none"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Descrição curta</span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
            />
          </label>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button className="rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-sm hover:opacity-90">
            Criar loja
          </button>
        </form>
      </div>
    </div>
  );
}
