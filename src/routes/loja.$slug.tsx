import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { PublicStoreView } from "@/components/PublicStoreView";

export const Route = createFileRoute("/loja/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Loja — Armazix" },
      { name: "description", content: "Confira nossos produtos." },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold">Loja não encontrada</h1>
        <p className="mt-2 text-muted-foreground">
          O link que você acessou não existe.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Ir para início
        </Link>
      </div>
    </div>
  ),
  component: PublicStore,
});

function PublicStore() {
  const { slug } = Route.useParams();
  return <PublicStoreView slug={slug} />;
}
