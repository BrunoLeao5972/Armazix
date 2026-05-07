import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { PublicStoreView } from "@/components/PublicStoreView";
import { buildAppUrl } from "@/lib/seo";
import { selectStoreBySlug } from "@/lib/store";

function prettifySlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const Route = createFileRoute("/loja/$slug")({
  head: ({ params }) => {
    const store = selectStoreBySlug(params.slug);
    const readableName = prettifySlug(params.slug);
    const storeName = store?.name?.trim() || readableName || "Loja";
    const storeDescription =
      store?.description?.trim() ||
      `${storeName}: loja online com catálogo de produtos e pedido rápido pelo celular.`;
    const canonicalUrl = buildAppUrl(`/loja/${params.slug}`);

    return {
    meta: [
      { title: `${storeName} | Loja online na Armazix` },
      { name: "description", content: storeDescription },
      {
        name: "keywords",
        content: `${storeName}, loja online ${storeName}, catálogo online, ecommerce local, comprar ${storeName}`,
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: `${storeName} | Loja online` },
      { property: "og:description", content: storeDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "Store",
          name: storeName,
          description: storeDescription,
          url: canonicalUrl,
          address: store?.addressInfo?.city
            ? {
                "@type": "PostalAddress",
                addressLocality: store.addressInfo.city,
                addressRegion: store.addressInfo.state,
              }
            : undefined,
        },
      },
    ],
    links: [
      {
        rel: "canonical",
        href: canonicalUrl,
      },
    ],
    };
  },
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
