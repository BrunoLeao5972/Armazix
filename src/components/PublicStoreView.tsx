import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCart, useTenant, formatBRL, type Product } from "@/lib/store";
import {
  Search,
  Share2,
  Heart,
  Flame,
  Droplets,
  CupSoda,
  Snowflake,
  Sparkles,
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  ShoppingCart,
  Clock3,
  MapPin,
  ShieldCheck,
  Truck,
  Store as StoreIcon,
  CreditCard,
  X,
  Trash2,
} from "lucide-react";

type PublicStoreViewProps = {
  slug: string;
  rootHref?: string;
  checkoutHref?: string;
  /** Data preloaded from the server DB (takes priority over local Zustand state) */
  serverData?: {
    store: {
      id: string;
      name: string;
      slug: string;
      description: string;
      logoUrl?: string | null;
      phones?: unknown;
      whatsapp?: string | null;
      address?: string | null;
      addressInfo?: { cep: string; street: string; number: string; city: string; state: string; complement: string } | null;
      businessHours?: unknown;
      delivery?: { pickup: boolean; localDelivery: boolean; fee: number; fees: { label: string; fee: number }[] } | null;
      payments?: { pix: boolean; card: boolean; cash: boolean; credit: boolean; debit: boolean; pixKeyType: string; pixBank: string; pixKey: string; pixReceiverName: string; pixReceiverDocument: string; pixQrCode: string } | null;
      banners?: { imageUrl: string; title: string; subtitle: string; autoAdvanceSeconds: number }[] | null;
      categories?: unknown;
      plan: string;
    };
    products: {
      id: string;
      storeId: string;
      code: number;
      name: string;
      description: string;
      price: number; // cents
      stock: number;
      unit: string;
      minStock: number;
      category: string;
      imageUrl?: string | null;
      images?: unknown;
      active: boolean;
      featured: boolean;
      onPromotion: boolean;
      promotionPrice?: number | null;
      variations?: unknown;
    }[];
  } | null;
};

type BannerItem = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  autoAdvanceSeconds: number;
};

type SectionDef = {
  key: string;
  title: string;
  emoji: string;
  products: Product[];
};

const EMPTY_CART: never[] = [];

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  bebidas: { label: "Bebidas", icon: <CupSoda className="h-4 w-4" /> },
  snacks: { label: "Snacks", icon: <Sparkles className="h-4 w-4" /> },
  higiene: { label: "Higiene", icon: <Droplets className="h-4 w-4" /> },
  congelados: { label: "Congelados", icon: <Snowflake className="h-4 w-4" /> },
  ofertas: { label: "Ofertas", icon: <Flame className="h-4 w-4" /> },
};

const fallbackImages = [
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1622715390357-0ff8f62e6f11?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1515627498533-7aa86a2d5a4e?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1606756790138-261d2b21cd75?auto=format&fit=crop&q=80&w=1200",
];

export function PublicStoreView({
  slug,
  rootHref = `/loja/${slug}`,
  checkoutHref = `/loja/${slug}/checkout`,
  serverData,
}: PublicStoreViewProps) {
  const zustandStore = useTenant((s) => s.stores.find((x) => x.slug === slug));
  const allZustandProducts = useTenant((s) => s.products);

  // Prefer server data over local IndexedDB
  const store = serverData?.store ?? zustandStore;
  const storeBanners = (store as { banners?: { imageUrl: string; title: string; subtitle: string; autoAdvanceSeconds: number }[] } | undefined)?.banners;

  const products = useMemo<Product[]>(() => {
    if (serverData) {
      return serverData.products
        .filter((p) => p.active !== false)
        .map((p) => ({
          id: p.id,
          storeId: p.storeId,
          code: p.code,
          name: p.name,
          description: p.description,
          price: p.price / 100, // cents → BRL
          stock: p.stock,
          unit: p.unit,
          minStock: p.minStock,
          category: p.category,
          image: p.imageUrl ?? "",
          imageUrl: p.imageUrl ?? "",
          images: Array.isArray(p.images) ? (p.images as string[]) : [],
          active: p.active,
          featured: p.featured,
          onPromotion: p.onPromotion,
          promotionPrice: p.promotionPrice ? p.promotionPrice / 100 : undefined,
          variations: Array.isArray(p.variations) ? (p.variations as Product["variations"]) : [],
        }));
    }
    return zustandStore ? allZustandProducts.filter((p) => p.storeId === zustandStore.id) : [];
  }, [serverData, zustandStore, allZustandProducts]);

  const cartRaw = useCart((c) => c.carts[slug]);
  const cart = cartRaw ?? EMPTY_CART;
  const add = useCart((c) => c.add);
  const setQty = useCart((c) => c.setQty);
  const remove = useCart((c) => c.remove);

  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState<string>("todos");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [openCart, setOpenCart] = useState(false);

  const banners = useMemo<BannerItem[]>(() => {
    const configured = (storeBanners ?? [])
      .slice(0, 3)
      .map((banner, index) => ({
        id: `store-banner-${index + 1}`,
        title: banner.title?.trim() || "Banner",
        subtitle: banner.subtitle?.trim() || "Confira nossas novidades.",
        cta: "Explorar",
        image: banner.imageUrl?.trim() || "",
        autoAdvanceSeconds:
          Number.isFinite(Number(banner.autoAdvanceSeconds)) && Number(banner.autoAdvanceSeconds) >= 2
            ? Math.min(30, Math.max(2, Math.round(Number(banner.autoAdvanceSeconds))))
            : 5,
      }))
      .filter((banner) => banner.image);

    return configured;
  }, [storeBanners]);

  useEffect(() => {
    if (bannerIndex <= banners.length - 1) return;
    setBannerIndex(0);
  }, [bannerIndex, banners.length]);

  useEffect(() => {
    if (!banners.length) return;

    const currentBanner = banners[bannerIndex] ?? banners[0];
    const timer = window.setTimeout(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, currentBanner.autoAdvanceSeconds * 1000);

    return () => window.clearTimeout(timer);
  }, [bannerIndex, banners]);

  const locationLabel = useMemo(() => {
    const city = store?.addressInfo?.city?.trim();
    const state = store?.addressInfo?.state?.trim();
    if (city && state) return `${city}, ${state}`;
    if ((store as { address?: string } | undefined)?.address?.trim()) return (store as { address?: string }).address!;
    return "Endereco nao informado";
  }, [(store as { address?: string } | undefined)?.address, store?.addressInfo?.city, store?.addressInfo?.state]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const cartQtyById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) map.set(item.productId, item.quantity);
    return map;
  }, [cart]);

  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [products, query]);

  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    for (const product of baseFiltered) {
      const key = product.category?.trim() ? product.category.trim() : "geral";
      const bucket = grouped.get(key) ?? [];
      bucket.push(product);
      grouped.set(key, bucket);
    }
    return grouped;
  }, [baseFiltered]);

  const promoProducts = useMemo(() => {
    const promo = baseFiltered.filter(
      (p) =>
        p.onPromotion ||
        (typeof p.promotionPrice === "number" && p.promotionPrice > 0 && p.promotionPrice < p.price),
    );
    return promo.length > 0 ? promo : baseFiltered.slice(0, 8);
  }, [baseFiltered]);

  const bestSellerProducts = useMemo(() => {
    const featured = baseFiltered.filter((p) => p.featured);
    return featured.length > 0 ? featured : baseFiltered.slice(0, 8);
  }, [baseFiltered]);

  const categorySections = useMemo<SectionDef[]>(() => {
    const sections: SectionDef[] = [
      {
        key: "ofertas",
        title: "Ofertas da Semana",
        emoji: "🔥",
        products: promoProducts,
      },
      {
        key: "mais-vendidos",
        title: "Mais Vendidos",
        emoji: "⭐",
        products: bestSellerProducts,
      },
    ];

    for (const [name, list] of productsByCategory.entries()) {
      if (!list.length) continue;
      sections.push({
        key: name.toLowerCase(),
        title: name,
        emoji: "🛍️",
        products: list,
      });
    }

    return sections;
  }, [productsByCategory, promoProducts, bestSellerProducts]);

  const visibleSections = useMemo(() => {
    if (activeChip === "todos") return categorySections;
    return categorySections.filter(
      (s) => s.key === activeChip || s.title.toLowerCase() === activeChip,
    );
  }, [activeChip, categorySections]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-foreground">
      <div className="mx-auto w-full max-w-[1020px] px-3 pb-28 pt-2 sm:px-4">
        <section className="rounded-3xl border border-border/60 bg-white p-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-black uppercase">
                {store?.logoUrl ? (
                  <img
                    src={store?.logoUrl}
                    alt={`Logo ${store?.name}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  store?.name?.slice(0, 2) ?? ""
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-black leading-tight">{store?.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" /> Aberto
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" /> 30-40 min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {locationLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <button className="rounded-full p-2 transition-colors hover:bg-muted" aria-label="Compartilhar loja">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="rounded-full p-2 transition-colors hover:bg-muted" aria-label="Favoritar loja">
                <Heart className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produtos na loja..."
              className="h-12 w-full rounded-2xl border border-transparent bg-muted pl-10 pr-4 text-sm outline-none transition-all focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </section>

        {banners.length > 0 && (
          <section className="mt-4 overflow-hidden rounded-3xl border border-border/60 bg-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)]">
            <div className="relative aspect-[2.9/1] min-h-[170px] w-full sm:aspect-[3.2/1]">
              {banners.map((banner, idx) => (
                <article
                  key={banner.id}
                  className={`absolute inset-0 transition-all duration-700 ${
                    idx === bannerIndex
                      ? "translate-x-0 opacity-100"
                      : idx < bannerIndex
                        ? "-translate-x-3 opacity-0"
                        : "translate-x-3 opacity-0"
                  }`}
                >
                  <img src={banner.image} alt={banner.title} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
                  <div className="absolute bottom-4 left-4 max-w-[70%] text-white">
                    <h2 className="text-2xl font-black leading-tight sm:text-4xl">{banner.title}</h2>
                    <p className="mt-1 text-sm text-white/90 sm:text-lg">{banner.subtitle}</p>
                    <button className="mt-4 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-800 shadow-md transition-transform hover:scale-[1.03]">
                      {banner.cta}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 py-3">
              {banners.map((banner, idx) => (
                <button
                  key={banner.id}
                  onClick={() => setBannerIndex(idx)}
                  aria-label={`Banner ${idx + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === bannerIndex ? "w-6 bg-primary" : "w-2.5 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-4">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip
              active={activeChip === "todos"}
              onClick={() => setActiveChip("todos")}
              icon={<StoreIcon className="h-4 w-4" />}
              label="Todos"
            />
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <Chip
                key={key}
                active={activeChip === key}
                onClick={() => setActiveChip(key)}
                icon={meta.icon}
                label={meta.label}
              />
            ))}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <BenefitCard icon={<Truck className="h-5 w-5 text-orange-500" />} title="Entrega Rapida" subtitle="Em ate 30 minutos" />
          <BenefitCard icon={<ShieldCheck className="h-5 w-5 text-blue-600" />} title="Compra Segura" subtitle="100% protegida" />
          <BenefitCard icon={<Sparkles className="h-5 w-5 text-green-600" />} title="Produtos Frescos" subtitle="Qualidade garantida" />
          <BenefitCard icon={<CreditCard className="h-5 w-5 text-amber-600" />} title="Pagamento Facil" subtitle="Varias opcoes" />
        </section>

        <main className="mt-7 space-y-7">
          {visibleSections.map((section) => (
            <ShowcaseRow
              key={section.key}
              title={section.title}
              emoji={section.emoji}
              products={section.products}
              slug={slug}
              add={add}
              setQty={setQty}
              remove={remove}
              cartQtyById={cartQtyById}
            />
          ))}
        </main>
      </div>

      <button
        onClick={() => setOpenCart(true)}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-[0_14px_34px_-12px_rgba(249,115,22,0.8)] transition-transform hover:scale-[1.03]"
      >
        <ShoppingCart className="h-4 w-4" />
        {cartCount}
      </button>

      {openCart && (
        <CartDrawer
          slug={slug}
          checkoutHref={checkoutHref}
          onClose={() => setOpenCart(false)}
          cart={cart}
        />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-base font-bold transition-all ${
        active
          ? "border-orange-500 bg-orange-500 text-white shadow-[0_8px_20px_-10px_rgba(249,115,22,0.75)]"
          : "border-border bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BenefitCard({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <article className="rounded-3xl border border-border/70 bg-white p-4 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.35)]">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">{icon}</div>
      <p className="text-[15px] font-extrabold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </article>
  );
}

function ShowcaseRow({
  title,
  emoji,
  products,
  slug,
  add,
  setQty,
  remove,
  cartQtyById,
}: {
  title: string;
  emoji: string;
  products: Product[];
  slug: string;
  add: ReturnType<typeof useCart.getState>["add"];
  setQty: ReturnType<typeof useCart.getState>["setQty"];
  remove: ReturnType<typeof useCart.getState>["remove"];
  cartQtyById: Map<string, number>;
}) {
  if (!products.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-3xl font-black text-slate-950">
          <span className="text-2xl">{emoji}</span>
          {title}
        </h3>
        <div className="hidden items-center gap-2 md:flex">
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:bg-slate-100" aria-label="Anterior">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:bg-slate-100" aria-label="Proximo">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product, idx) => (
          <ProductCard
            key={product.id}
            product={product}
            image={product.imageUrl || fallbackImages[idx % fallbackImages.length]}
            qty={cartQtyById.get(product.id) ?? 0}
            onAdd={() =>
              add(slug, {
                productId: product.id,
                name: product.name,
                price: product.promotionPrice && product.promotionPrice > 0 ? product.promotionPrice : product.price,
                quantity: 1,
              })
            }
            onDecrease={() => {
              const next = (cartQtyById.get(product.id) ?? 0) - 1;
              if (next <= 0) remove(slug, product.id);
              else setQty(slug, product.id, next);
            }}
            onIncrease={() => setQty(slug, product.id, (cartQtyById.get(product.id) ?? 0) + 1)}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  image,
  qty,
  onAdd,
  onIncrease,
  onDecrease,
}: {
  product: Product;
  image: string;
  qty: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const finalPrice =
    product.promotionPrice && product.promotionPrice > 0 ? product.promotionPrice : product.price;
  const hasDiscount = finalPrice < product.price;
  const discountPct = hasDiscount
    ? Math.max(1, Math.round(((product.price - finalPrice) / product.price) * 100))
    : 0;

  return (
    <article className="w-[190px] shrink-0 snap-start overflow-hidden rounded-3xl border border-border/70 bg-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_26px_-12px_rgba(0,0,0,0.35)] sm:w-[205px]">
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-orange-400 px-2.5 py-1 text-xs font-black text-white">
            -{discountPct}%
          </span>
        )}
        {product.featured && (
          <span className="absolute left-3 top-12 rounded-full bg-fuchsia-500 px-2.5 py-1 text-xs font-black text-white">
            Destaque
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{product.category || "Produtos"}</p>
        <h4 className="line-clamp-2 min-h-[58px] text-[33px] leading-[1.15] font-black text-slate-900 sm:text-[35px]">{product.name}</h4>
        <p className="text-sm text-slate-500">{product.unit || "Unidade"}</p>

        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-4xl font-black text-slate-900">{formatBRL(finalPrice)}</p>
            {hasDiscount && (
              <p className="text-sm text-slate-400 line-through">{formatBRL(product.price)}</p>
            )}
          </div>

          {qty <= 0 ? (
            <button
              onClick={onAdd}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_10px_24px_-12px_rgba(249,115,22,0.9)] transition-transform hover:scale-105"
              aria-label="Adicionar item"
            >
              <Plus className="h-6 w-6" />
            </button>
          ) : (
            <div className="inline-flex items-center gap-1 rounded-2xl border border-orange-200 bg-orange-50 p-1">
              <button
                onClick={onDecrease}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-orange-700 hover:bg-orange-100"
                aria-label="Diminuir"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-7 text-center text-sm font-black text-orange-700">{qty}</span>
              <button
                onClick={onIncrease}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-orange-700 hover:bg-orange-100"
                aria-label="Aumentar"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CartDrawer({
  slug,
  checkoutHref,
  onClose,
  cart,
}: {
  slug: string;
  checkoutHref: string;
  onClose: () => void;
  cart: Array<{ productId: string; name: string; price: number; quantity: number }>;
}) {
  const setQty = useCart((c) => c.setQty);
  const remove = useCart((c) => c.remove);
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <aside className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xl font-black">Seu carrinho</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{cart.length} itens</p>
          </div>
          <button className="rounded-full p-2 hover:bg-muted" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto px-5 py-4">
          {cart.length === 0 && <p className="text-sm text-muted-foreground">Carrinho vazio.</p>}
          {cart.map((item) => (
            <article key={item.productId} className="flex items-center justify-between rounded-2xl border border-border bg-slate-50 p-3">
              <div className="min-w-0 pr-2">
                <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                <p className="text-sm font-black text-slate-900">{formatBRL(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => (item.quantity <= 1 ? remove(slug, item.productId) : setQty(slug, item.productId, item.quantity - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-border">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm font-black">{item.quantity}</span>
                <button onClick={() => setQty(slug, item.productId, item.quantity + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-border">
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={() => remove(slug, item.productId)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>

        <footer className="border-t border-border bg-white px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Total</span>
            <span className="text-2xl font-black text-slate-900">{formatBRL(total)}</span>
          </div>
          <a href={checkoutHref} className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_12px_28px_-12px_rgba(249,115,22,0.9)]">
            Finalizar pedido
          </a>
        </footer>
      </aside>
    </div>
  );
}
