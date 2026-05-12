import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { formatBRL, useTenant } from "@/lib/store";
import { Package } from "lucide-react";

export const Route = createFileRoute("/loja/$slug/produto/$productId")({
  component: PublicProductDetailPage,
});

function PublicProductDetailPage() {
  const { slug, productId } = Route.useParams();

  const store = useTenant((s) => s.stores.find((candidate) => candidate.slug === slug));
  const products = useTenant((s) => s.products);

  const product = useMemo(() => {
    if (!store) return null;
    return products.find((candidate) => candidate.storeId === store.id && candidate.id === productId) ?? null;
  }, [store, products, productId]);

  if (!store || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] px-4">
        <div className="max-w-md rounded-3xl border border-border bg-white p-6 text-center shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)]">
          <h1 className="text-2xl font-black text-slate-900">Item nao encontrado</h1>
          <p className="mt-2 text-sm text-slate-600">
            Este produto nao esta mais disponivel ou o link esta incorreto.
          </p>
          <Link
            to="/loja/$slug"
            params={{ slug }}
            className="mt-4 inline-flex rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white"
          >
            Voltar para loja
          </Link>
        </div>
      </div>
    );
  }

  const image = product.imageUrl || product.image || "";
  const finalPrice =
    product.promotionPrice && product.promotionPrice > 0 ? product.promotionPrice : product.price;

  return (
    <div className="min-h-screen bg-[#f4f5f7] px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-white p-5 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{store.name}</p>
            <h1 className="text-3xl font-black text-slate-900">{product.name}</h1>
          </div>
          <Link
            to="/loja/$slug"
            params={{ slug }}
            className="rounded-full border border-border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Voltar
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            {image ? (
              <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex min-h-[280px] items-center justify-center text-slate-400">
                <Package className="h-14 w-14" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Categoria: {product.category || "Produtos"}
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              {product.description || "Sem descricao detalhada para este item."}
            </p>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Preco</p>
              <p className="mt-1 text-3xl font-black text-slate-900">{formatBRL(finalPrice)}</p>
              {product.promotionPrice && product.promotionPrice > 0 && (
                <p className="text-sm text-slate-400 line-through">{formatBRL(product.price)}</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>Unidade: {product.unit || "UN"}</p>
              <p>Estoque atual: {product.stock}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
