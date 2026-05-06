import { Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useTenant, useCart, formatBRL, type Product } from "@/lib/store";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Search,
  Store as StoreIcon,
  Truck,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  ShoppingBag,
  Star,
  Clock,
  MapPin
} from "lucide-react";

type PublicStoreViewProps = {
  slug: string;
  rootHref?: string;
  checkoutHref?: string;
};

const EMPTY_CART: never[] = [];

export function PublicStoreView({
  slug,
  rootHref = `/loja/${slug}`,
  checkoutHref = `/loja/${slug}/checkout`,
}: PublicStoreViewProps) {
  const store = useTenant((s) => s.stores.find((x) => x.slug === slug));
  const allProducts = useTenant((s) => s.products);
  const products = useMemo(
    () => (store ? allProducts.filter((p) => p.storeId === store.id) : []),
    [allProducts, store],
  );
  const cartRaw = useCart((c) => c.carts[slug]);
  const cart = cartRaw ?? EMPTY_CART;
  const [openCart, setOpenCart] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (category) list = list.filter((p) => p.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, category, query]);

  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl mb-6">
            🏝️
          </div>
          <h1 className="text-4xl font-black tracking-tight">Loja não encontrada</h1>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">
            O link que você acessou não existe ou a loja foi removida do sistema Armazix.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-background selection:bg-primary/10 selection:text-primary">
      {/* HEADER */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? "border-b border-border bg-white/80 py-3 backdrop-blur-xl dark:bg-background/80" 
          : "bg-transparent py-5"
      }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6">
          <a href={rootHref} className="group flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
              <StoreIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black leading-tight tracking-tight text-foreground">{store.name}</h1>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Loja Oficial
              </div>
            </div>
          </a>

          <button
            onClick={() => setOpenCart(true)}
            className="group relative flex items-center gap-3 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background transition-all hover:opacity-90 hover:shadow-xl active:scale-95"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground ring-4 ring-background">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-white dark:bg-card pt-10 pb-20">
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
          </svg>
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="animate-in fade-in slide-in-from-left-8 duration-700">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary mb-6">
                <Star className="h-3 w-3 fill-current" /> Destaque da Semana
              </div>
              <h2 className="text-5xl font-black leading-[1.1] tracking-tight text-foreground lg:text-7xl">
                Tudo o que você <br />
                <span className="text-primary">ama</span> em um só lugar.
              </h2>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground leading-relaxed">
                {store.description || "Confira nossa seleção exclusiva de produtos preparados com carinho para você."}
              </p>

              <div className="mt-10 flex flex-wrap gap-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  Entrega Rápida
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  Pagamento Seguro
                </div>
              </div>
            </div>

            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000">
              <div className="aspect-[4/3] overflow-hidden rounded-[2.5rem] bg-muted shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1000" 
                  alt="Store front"
                  className="h-full w-full object-cover"
                />
              </div>
              {/* Floating badges */}
              <div className="absolute -bottom-6 -left-6 rounded-3xl bg-white p-6 shadow-xl dark:bg-card border border-border">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-600">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className="font-bold text-foreground">Aberto agora</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH & CATEGORIES BAR */}
      <div className="sticky top-20 z-40 mx-auto max-w-7xl px-6 -mt-10">
        <div className="rounded-[2rem] border border-border bg-white/70 p-4 shadow-2xl backdrop-blur-2xl dark:bg-card/70">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="O que você está procurando hoje?"
                className="h-14 w-full rounded-2xl bg-muted/50 pl-12 pr-4 text-sm font-medium outline-none transition-all focus:bg-white focus:ring-4 focus:ring-primary/5 dark:focus:bg-background"
              />
            </div>
            {categories.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                {categories.map((c) => (
                  <button
                    key={c || "all"}
                    onClick={() => setCategory(c)}
                    className={`whitespace-nowrap rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                      category === c
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c || "Todos"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h3 className="text-3xl font-black tracking-tight text-foreground">
              {category || "Catálogo Completo"}
            </h3>
            <p className="mt-1 text-sm font-bold text-muted-foreground uppercase tracking-widest">
              {filtered.length} {filtered.length === 1 ? "Produto encontrado" : "Produtos encontrados"}
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[3rem] border border-dashed border-border bg-white py-24 text-center dark:bg-card">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl mb-6">
              🔍
            </div>
            <h4 className="text-2xl font-black text-foreground">Nenhum resultado</h4>
            <p className="mt-2 text-muted-foreground">
              Não encontramos o que você busca. Tente outro termo ou categoria.
            </p>
            <button 
              onClick={() => {setQuery(""); setCategory("");}}
              className="mt-8 text-sm font-black uppercase tracking-widest text-primary hover:underline"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} slug={slug} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-white py-16 dark:bg-card">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <StoreIcon className="h-5 w-5" />
              </div>
              <span className="font-black tracking-tight">{store.name}</span>
            </div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              © {new Date().getFullYear()} • Criado com <Link to="/" className="text-primary hover:underline">Armazix</Link>
            </div>
          </div>
        </div>
      </footer>

      {openCart && (
        <CartDrawer
          slug={slug}
          checkoutHref={checkoutHref}
          onClose={() => setOpenCart(false)}
        />
      )}
    </div>
  );
}

function ProductCard({ p, slug }: { p: Product; slug: string }) {
  const add = useCart((c) => c.add);
  const out = p.stock <= 0;
  return (
    <article className="group flex flex-col overflow-hidden rounded-[2.5rem] border border-border bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:bg-card">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-7xl transition-transform duration-700 group-hover:scale-110">
            {p.image}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {p.category && (
          <span className="absolute left-5 top-5 rounded-xl bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground backdrop-blur-md shadow-sm">
            {p.category}
          </span>
        )}
        {out && (
          <span className="absolute right-5 top-5 rounded-xl bg-destructive px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-destructive-foreground shadow-lg">
            Esgotado
          </span>
        )}
      </div>
      
      <div className="flex flex-1 flex-col p-8">
        <h4 className="text-xl font-black leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors">{p.name}</h4>
        {p.description && (
          <p className="mt-2 line-clamp-2 text-sm font-medium text-muted-foreground leading-relaxed">
            {p.description}
          </p>
        )}
        
        <div className="mt-auto flex items-center justify-between pt-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço</span>
            <span className="text-2xl font-black text-foreground">{formatBRL(p.price)}</span>
          </div>
          <button
            disabled={out}
            onClick={() =>
              add(slug, {
                productId: p.id,
                name: p.name,
                price: p.price,
                quantity: 1,
              })
            }
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-20 disabled:grayscale"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>
    </article>
  );
}

function CartDrawer({
  slug,
  checkoutHref,
  onClose,
}: {
  slug: string;
  checkoutHref: string;
  onClose: () => void;
}) {
  const cart = useCart((c) => c.carts[slug] ?? []);
  const { remove, setQty } = useCart();
  const total = cart.reduce((a, i) => a + i.price * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-500 dark:bg-card">
        <div className="flex items-center justify-between border-b border-border p-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Seu Carrinho</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">
              {cart.length} {cart.length === 1 ? "Item selecionado" : "Itens selecionados"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-5xl mb-6">
                🛒
              </div>
              <h3 className="text-xl font-black">Carrinho vazio</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Adicione produtos para continuar sua compra.
              </p>
              <button
                onClick={onClose}
                className="mt-8 text-sm font-black uppercase tracking-widest text-primary hover:underline"
              >
                Explorar Produtos
              </button>
            </div>
          ) : (
            cart.map((i) => (
              <div key={i.productId} className="flex items-center gap-4 group">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-muted text-3xl">
                  📦
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-black text-foreground">{i.name}</h4>
                  <p className="text-sm font-bold text-primary">{formatBRL(i.price)}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center rounded-xl border border-border bg-muted/30 p-1">
                      <button
                        onClick={() => setQty(slug, i.productId, i.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white dark:hover:bg-background"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-black">{i.quantity}</span>
                      <button
                        onClick={() => setQty(slug, i.productId, i.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white dark:hover:bg-background"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => remove(slug, i.productId)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-border p-8 space-y-6 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Total Estimado</span>
              <span className="text-3xl font-black text-foreground">{formatBRL(total)}</span>
            </div>
            <Link
              to={checkoutHref as "/admin"}
              className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-primary py-5 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Finalizar Compra <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
