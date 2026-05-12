import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  normalizeStore,
  useAuth,
  useTenant,
  formatBRL,
  type Product,
  type ProductVariation,
} from "@/lib/store";
import { upsertStoreSettingsFn } from "@/lib/storeFns";
import { useCurrentStore } from "./admin";
import {
  AlertTriangle,
  Check,
  DollarSign,
  ImageIcon,
  Layers,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  Tag,
  Trash2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/admin/produtos")({
  component: ProductsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductForm = {
  code: number;
  name: string;
  description: string;
  price: number;
  cost?: number;
  unit: string;
  minStock: number;
  stock: number;
  category: string;
  image: string;
  imageUrl?: string;
  images?: string[];
  trackStock?: boolean;
  active?: boolean;
  allowSellWithoutStock?: boolean;
  featured?: boolean;
  onPromotion?: boolean;
  promotionPrice?: number;
  variations?: ProductVariation[];
};

const UNITS = ["UN", "KG", "LT", "CX", "PCT", "M", "M²", "HR", "PAR"];
const DESC_LIMIT = 500;

const emptyForm: ProductForm = {
  code: 1,
  name: "",
  description: "",
  price: 0,
  unit: "UN",
  minStock: 0,
  stock: 0,
  category: "",
  image: "PROD",
  imageUrl: "",
  images: [],
  trackStock: false,
  active: true,
  allowSellWithoutStock: true,
  featured: false,
  onPromotion: false,
  variations: [],
};

function ProductsPage() {
  const store = useCurrentStore();
  const currentUserId = useAuth((s) => s.currentUserId);
  const normalizedStore = useMemo(() => normalizeStore(store), [store]);
  const allProducts = useTenant((s) => s.products);
  const products = useMemo(
    () => allProducts.filter((p) => p.storeId === store.id),
    [allProducts, store.id],
  );
  const addProduct = useTenant((s) => s.addProduct);
  const updateProduct = useTenant((s) => s.updateProduct);
  const removeProduct = useTenant((s) => s.removeProduct);

  const currentPlan = store.plan ?? "free";
  const limitByPlan = { free: 20, basic: 100, plus: 400, pro: Infinity } as const;
  const limit = limitByPlan[currentPlan] ?? Infinity;
  const atLimit = products.length >= limit;

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [limitErr, setLimitErr] = useState(false);
  const [syncErr, setSyncErr] = useState("");

  const persistProductsToServer = async () => {
    if (!currentUserId) return;

    const state = useTenant.getState();
    const nextProducts = state.products.filter((p) => p.storeId === store.id);

    await upsertStoreSettingsFn({
      data: {
        storeId: normalizedStore.id,
        ownerUserId: currentUserId,
        name: normalizedStore.name,
        slug: normalizedStore.slug,
        description: normalizedStore.description,
        settings: {
          logoUrl: normalizedStore.logoUrl,
          banners: normalizedStore.banners,
          taxId: normalizedStore.taxId,
          cnpj: normalizedStore.cnpj,
          address: normalizedStore.address,
          addressInfo: normalizedStore.addressInfo,
          businessHours: normalizedStore.businessHours,
          phones: normalizedStore.phones,
          whatsapp: normalizedStore.whatsapp,
          categories: normalizedStore.categories,
          delivery: normalizedStore.delivery,
          payments: normalizedStore.payments,
          pdvEnabled: normalizedStore.pdvEnabled,
          products: nextProducts,
        },
      },
    });
  };

  const storeCategories = useMemo(
    () => (store.categories ?? []).slice().sort((a, b) => a.localeCompare(b)),
    [store.categories],
  );

  const productCategories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (filterCat) list = list.filter((p) => p.category === filterCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, query, filterCat]);

  const startNew = () => {
    if (atLimit) { setLimitErr(true); return; }
    setLimitErr(false);
    setEditing(null);
    setOpen(true);
  };
  const startEdit = (p: Product) => {
    setEditing(p);
    setOpen(true);
  };

  return (
    <div className="relative mx-auto min-h-[calc(100vh-10rem)] max-w-7xl space-y-6 px-6 py-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o catálogo da sua loja.
          </p>
        </div>
        <button
          onClick={startNew}
          disabled={atLimit}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {limitErr && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/8 px-5 py-4 text-sm text-destructive">
          Limite de produtos atingido para o seu plano atual.
        </div>
      )}

      {syncErr && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/8 px-5 py-4 text-sm text-destructive">
          {syncErr}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        {productCategories.length > 1 && (
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas as categorias</option>
            {productCategories
              .filter(Boolean)
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Grid / Empty */}
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 font-medium">Nenhum produto cadastrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Comece adicionando seu primeiro produto.
          </p>
          <button
            onClick={startNew}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Cadastrar primeiro produto
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const isInactive = p.active === false;
              const mainImage = (p.images ?? []).find(Boolean) || p.imageUrl;
              const hasVariations = (p.variations ?? []).length > 0;
              return (
                <div
                  key={p.id}
                  className={`group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)] ${isInactive ? "opacity-60" : ""}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-6xl">
                        {p.image}
                      </div>
                    )}
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        onClick={() => startEdit(p)}
                        className="rounded-full bg-background/90 p-1.5 text-foreground shadow-sm backdrop-blur hover:bg-background"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`Remover "${p.name}"?`)) return;

                          setSyncErr("");
                          removeProduct(p.id);
                          void persistProductsToServer().catch((error) => {
                            setSyncErr(
                              error instanceof Error
                                ? error.message
                                : "Produto removido localmente, mas falhou ao sincronizar com o servidor.",
                            );
                          });
                        }}
                        className="rounded-full bg-background/90 p-1.5 text-destructive shadow-sm backdrop-blur hover:bg-background"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="absolute left-2 top-2 flex flex-col gap-1">
                      {isInactive && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Inativo
                        </span>
                      )}
                      {!isInactive && p.stock <= 0 && !p.allowSellWithoutStock && (
                        <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
                          Esgotado
                        </span>
                      )}
                      {!isInactive && p.stock > 0 && p.stock <= (p.minStock ?? 0) && (
                        <span className="rounded-full bg-orange-500/90 px-2 py-0.5 text-xs font-medium text-white">
                          Estoque baixo
                        </span>
                      )}
                      {p.onPromotion && p.promotionPrice != null && (
                        <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                          Promoção
                        </span>
                      )}
                      {p.featured && (
                        <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-medium text-white">
                          Destaque
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    {p.category && (
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {p.category}
                      </span>
                    )}
                    <h3 className="font-semibold leading-tight">{p.name}</h3>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Código: #{String(p.code ?? 0).padStart(4, "0")}
                    </p>
                    {p.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    {hasVariations && (
                      <p className="text-[11px] text-muted-foreground">
                        {(p.variations ?? []).length} variação(ões)
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div>
                        {p.onPromotion && p.promotionPrice != null ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground line-through">{formatBRL(p.price)}</span>
                            <span className="text-lg font-bold text-green-600">{formatBRL(p.promotionPrice)}</span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-primary">{formatBRL(p.price)}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.stock} {p.unit || "un"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Mínimo: {p.minStock ?? 0}</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {open && (
        <ProductModal
          initial={editing}
          products={products}
          categories={storeCategories}
          onClose={() => setOpen(false)}
          onSave={(data) => {
            if (editing) {
              setSyncErr("");
              updateProduct(editing.id, data);
              void persistProductsToServer().catch((error) => {
                setSyncErr(
                  error instanceof Error
                    ? error.message
                    : "Produto atualizado localmente, mas falhou ao sincronizar com o servidor.",
                );
              });
              setOpen(false);
            } else {
              setSyncErr("");
              const result = addProduct(store.id, data);
              if (result.ok) {
                void persistProductsToServer().catch((error) => {
                  setSyncErr(
                    error instanceof Error
                      ? error.message
                      : "Produto criado localmente, mas falhou ao sincronizar com o servidor.",
                  );
                });
                setOpen(false);
              } else {
                setLimitErr(true);
                setOpen(false);
              }
            }
          }}
        />
      )}
    </div>
  );
}

function ProductModal({
  initial,
  products,
  categories: initialCategories,
  onClose,
  onSave,
}: {
  initial: Product | null;
  products: Product[];
  categories: string[];
  onClose: () => void;
  onSave: (p: ProductForm) => void;
}) {
  const store = useCurrentStore();
  const userId = useAuth((s) => s.currentUserId);
  const updateStore = useTenant((s) => s.updateStore);
  const normalizedStore = useMemo(() => normalizeStore(store), [store]);

  // Local categories so "+ Nova categoria" reflects immediately
  const [categories, setCategories] = useState(initialCategories);

  const nextCode = useMemo(() => {
    const highest = products.reduce(
      (max, p) => Math.max(max, Number(p.code) || 0),
      0,
    );
    return highest + 1;
  }, [products]);

  const [form, setForm] = useState<ProductForm>(
    initial
      ? {
          code: initial.code,
          name: initial.name,
          description: initial.description,
          price: initial.price,
          cost: (initial as ProductForm).cost,
          stock: initial.stock,
          unit: initial.unit || "UN",
          minStock: initial.minStock ?? 0,
          category: initial.category,
          image: initial.image || "PROD",
          imageUrl: initial.imageUrl ?? "",
          images: (initial as ProductForm).images ?? [],
          trackStock: (initial as ProductForm).trackStock ?? false,
          active: (initial as ProductForm).active ?? true,
          allowSellWithoutStock: (initial as ProductForm).allowSellWithoutStock ?? true,
          featured: (initial as ProductForm).featured ?? false,
          onPromotion: (initial as ProductForm).onPromotion ?? false,
          promotionPrice: (initial as ProductForm).promotionPrice,
          variations: (initial as ProductForm).variations ?? [],
        }
      : { ...emptyForm, code: nextCode },
  );

  const [formErr, setFormErr] = useState("");
  const [saved, setSaved] = useState(false);

  // "Nova categoria" mini-modal
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatValue, setNewCatValue] = useState("");
  const [newCatErr, setNewCatErr] = useState("");

  // Chip inputs — one string per variation
  const [varValueInputs, setVarValueInputs] = useState<string[]>([]);

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageErr, setImageErr] = useState("");

  // Auto margin
  const margin = useMemo(() => {
    if (!form.cost || form.cost <= 0 || form.price <= 0) return null;
    return ((form.price - form.cost) / form.price) * 100;
  }, [form.cost, form.price]);

  // ── Image handlers ────────────────────────────────────────────────────────

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    setImageErr("");
    let skipped = 0;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
        skipped++;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setForm((prev) => ({
            ...prev,
            images: [...(prev.images ?? []), reader.result as string],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    if (skipped > 0)
      setImageErr(`${skipped} arquivo(s) ignorado(s) — máx 3 MB, apenas imagens.`);
  };

  const removeImage = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      images: (prev.images ?? []).filter((_, i) => i !== idx),
    }));

  // ── Variation handlers ────────────────────────────────────────────────────

  const addVariation = () => {
    const v: ProductVariation = { id: crypto.randomUUID(), name: "", values: [] };
    setForm((prev) => ({ ...prev, variations: [...(prev.variations ?? []), v] }));
    setVarValueInputs((prev) => [...prev, ""]);
  };

  const removeVariation = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      variations: (prev.variations ?? []).filter((_, i) => i !== idx),
    }));
    setVarValueInputs((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateVariationName = (idx: number, name: string) =>
    setForm((prev) => {
      const vars = [...(prev.variations ?? [])];
      vars[idx] = { ...vars[idx], name };
      return { ...prev, variations: vars };
    });

  const addVariationValue = (varIdx: number, label: string) => {
    if (!label.trim()) return;
    setForm((prev) => {
      const vars = [...(prev.variations ?? [])];
      vars[varIdx] = {
        ...vars[varIdx],
        values: [...vars[varIdx].values, { id: crypto.randomUUID(), label: label.trim() }],
      };
      return { ...prev, variations: vars };
    });
    setVarValueInputs((prev) => {
      const next = [...prev];
      next[varIdx] = "";
      return next;
    });
  };

  const removeVariationValue = (varIdx: number, valIdx: number) =>
    setForm((prev) => {
      const vars = [...(prev.variations ?? [])];
      vars[varIdx] = {
        ...vars[varIdx],
        values: vars[varIdx].values.filter((_, i) => i !== valIdx),
      };
      return { ...prev, variations: vars };
    });

  // ── Category handlers ─────────────────────────────────────────────────────

  const handleAddCategory = async () => {
    const cat = newCatValue.trim();
    if (!cat) { setNewCatErr("Informe o nome da categoria."); return; }
    if (categories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
      setNewCatErr("Categoria já existe."); return;
    }
    const updated = [...categories, cat].sort((a, b) => a.localeCompare(b));
    setCategories(updated);
    updateStore(store.id, { categories: updated });
    setForm((prev) => ({ ...prev, category: cat }));
    setNewCatValue("");
    setNewCatErr("");
    setNewCatOpen(false);

    if (!userId) return;

    try {
      await upsertStoreSettingsFn({
        data: {
          storeId: normalizedStore.id,
          ownerUserId: userId,
          name: normalizedStore.name,
          slug: normalizedStore.slug,
          description: normalizedStore.description,
          settings: {
            logoUrl: normalizedStore.logoUrl,
            banners: normalizedStore.banners,
            taxId: normalizedStore.taxId,
            cnpj: normalizedStore.cnpj,
            address: normalizedStore.address,
            addressInfo: normalizedStore.addressInfo,
            businessHours: normalizedStore.businessHours,
            phones: normalizedStore.phones,
            whatsapp: normalizedStore.whatsapp,
            categories: updated,
            delivery: normalizedStore.delivery,
            payments: normalizedStore.payments,
            pdvEnabled: normalizedStore.pdvEnabled,
          },
        },
      });
    } catch {
      setNewCatErr("Categoria criada localmente, mas falhou ao salvar no banco.");
      setNewCatOpen(true);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = Number(form.code);
    if (!Number.isInteger(normalizedCode) || normalizedCode <= 0) {
      setFormErr("Informe um código válido e maior que zero."); return;
    }
    if (products.some((p) => p.id !== initial?.id && Number(p.code) === normalizedCode)) {
      setFormErr(`O código ${normalizedCode} já está em uso.`); return;
    }
    if (!form.name.trim()) {
      setFormErr("O nome do produto é obrigatório."); return;
    }
    if (products.some((p) => p.id !== initial?.id && p.name.trim().toLowerCase() === form.name.trim().toLowerCase())) {
      setFormErr("Já existe um produto com este nome."); return;
    }
    if (form.description.length > DESC_LIMIT) {
      setFormErr(`Descrição deve ter no máximo ${DESC_LIMIT} caracteres.`); return;
    }
    if (!form.unit.trim()) {
      setFormErr("Selecione a unidade de medida."); return;
    }
    if (!form.category) {
      setFormErr("Selecione uma categoria para o produto."); return;
    }
    if (form.price < 0) {
      setFormErr("Preço não pode ser negativo."); return;
    }
    if (form.minStock < 0) {
      setFormErr("Estoque mínimo não pode ser negativo."); return;
    }
    if (form.onPromotion && (form.promotionPrice == null || form.promotionPrice <= 0)) {
      setFormErr("Informe o preço promocional válido."); return;
    }
    setFormErr("");
    setSaved(true);
    setTimeout(() => {
      const imgs = form.images ?? [];
      onSave({
        ...form,
        code: normalizedCode,
        unit: form.unit.trim(),
        name: form.name.trim(),
        imageUrl: imgs.length > 0 ? imgs[0] : (form.imageUrl ?? ""),
      });
    }, 300);
  };

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto rounded-2xl border border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto min-h-full w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 pb-3 pt-1 backdrop-blur-sm">
          <h2 className="text-lg font-semibold">
            {initial ? "Editar produto" : "Adicionar produto"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">

          {/* ── 1. Informações Gerais ───────────────────────────────────────── */}
          <FormSection title="Informações Gerais" icon={<Package className="h-4 w-4" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Código" type="number" value={String(form.code)}
                onChange={(v) => setForm({ ...form, code: Number(v) })} />
              <Input label="Nome *" value={form.name}
                onChange={(v) => setForm({ ...form, name: v })} />
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Descrição</span>
                <span className={`text-xs ${form.description.length > DESC_LIMIT ? "text-destructive" : "text-muted-foreground"}`}>
                  {form.description.length}/{DESC_LIMIT}
                </span>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, DESC_LIMIT) })}
                rows={3}
                placeholder="Descreva o produto…"
                className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
              />
            </div>
          </FormSection>

          {/* ── 2. Preço e Unidade ──────────────────────────────────────────── */}
          <FormSection title="Preço e Unidade" icon={<DollarSign className="h-4 w-4" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Preço de venda *</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <input required type="number" step="0.01" min="0" value={form.price}
                    onChange={(e) => setForm({ ...form, price: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 outline-none ring-ring focus:ring-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Custo (opcional)</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <input type="number" step="0.01" min="0" placeholder="0,00" value={form.cost ?? ""}
                    onChange={(e) => setForm({ ...form, cost: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 outline-none ring-ring focus:ring-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                </div>
              </div>
              {margin !== null && (
                <div className="flex flex-col gap-1.5 text-sm md:col-span-2">
                  <span className="font-medium text-muted-foreground">Margem calculada</span>
                  <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${margin < 0 ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-green-500/30 bg-green-500/5 text-green-700"}`}>
                    <span className="font-semibold">{margin.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground">sobre o preço de venda</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Unidade de medida *</span>
                <select required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </FormSection>

          {/* ── 3. Estoque ─────────────────────────────────────────────────── */}
          <FormSection title="Estoque" icon={<Layers className="h-4 w-4" />}>
            <Toggle label="Controlar estoque" description="Acompanhar quantidade disponível em tempo real"
              checked={form.trackStock ?? false} onChange={(v) => setForm({ ...form, trackStock: v })} />
            {form.trackStock && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Estoque atual" type="number" value={String(form.stock)}
                    onChange={(v) => setForm({ ...form, stock: Math.max(0, Number(v)) })} />
                  <Input label="Estoque mínimo" type="number" value={String(form.minStock)}
                    onChange={(v) => setForm({ ...form, minStock: Math.max(0, Number(v)) })} />
                </div>
                {form.stock > 0 && form.stock <= form.minStock && (
                  <div className="flex items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2.5 text-sm text-orange-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Estoque atual está abaixo do mínimo definido.
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* ── 4. Categoria ───────────────────────────────────────────────── */}
          <FormSection title="Categoria" icon={<Tag className="h-4 w-4" />}>
            <div className="flex gap-2">
              <select required value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2">
                <option value="" disabled>
                  {categories.length === 0 ? "Nenhuma categoria cadastrada" : "Selecione uma categoria"}
                </option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={() => setNewCatOpen(true)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                <Plus className="h-3.5 w-3.5" /> Nova categoria
              </button>
            </div>
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Ou cadastre categorias na aba de{" "}
                <a href="/admin/cadastros" className="text-primary hover:underline">Cadastros</a>.
              </p>
            )}
          </FormSection>

          {/* ── 5. Variações ───────────────────────────────────────────────── */}
          <FormSection title="Variações" icon={<Layers className="h-4 w-4" />}>
            <p className="text-xs text-muted-foreground">
              Ex: Cor, Tamanho. Cada variação pode ter preço adicional, estoque e SKU próprio.
            </p>
            {(form.variations ?? []).length === 0 ? (
              <button type="button" onClick={addVariation}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Plus className="h-4 w-4" /> Adicionar variação
              </button>
            ) : (
              <div className="space-y-4">
                {(form.variations ?? []).map((variation, varIdx) => (
                  <div key={variation.id} className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Nome da variação (ex: Cor, Tamanho)"
                        value={variation.name} onChange={(e) => updateVariationName(varIdx, e.target.value)}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2" />
                      <button type="button" onClick={() => removeVariation(varIdx)}
                        className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {variation.values.map((val, valIdx) => (
                        <span key={val.id}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm">
                          {val.label}
                          <button type="button" onClick={() => removeVariationValue(varIdx, valIdx)}
                            className="text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Adicionar valor (ex: Vermelho)"
                        value={varValueInputs[varIdx] ?? ""}
                        onChange={(e) => {
                          const next = [...varValueInputs];
                          next[varIdx] = e.target.value;
                          setVarValueInputs(next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addVariationValue(varIdx, varValueInputs[varIdx] ?? "");
                          }
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2" />
                      <button type="button" onClick={() => addVariationValue(varIdx, varValueInputs[varIdx] ?? "")}
                        className="rounded-md bg-muted px-3 py-2 text-sm hover:bg-muted/70">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Pressione Enter ou vírgula para adicionar um valor.</p>
                  </div>
                ))}
                <button type="button" onClick={addVariation}
                  className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Plus className="h-3.5 w-3.5" /> Adicionar outra variação
                </button>
              </div>
            )}
          </FormSection>

          {/* ── 6. Imagens ─────────────────────────────────────────────────── */}
          <FormSection title="Imagens" icon={<ImageIcon className="h-4 w-4" />}>
            <div role="button" tabIndex={0}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:bg-muted/40"
              onClick={() => imageInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") imageInputRef.current?.click(); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleAddImages(e.dataTransfer.files); }}>
              <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Clique ou arraste imagens aqui</p>
              <p className="text-xs text-muted-foreground">Máx 3 MB por arquivo · A primeira imagem será a principal</p>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handleAddImages(e.target.files)} />
            {imageErr && <p className="text-xs text-destructive">{imageErr}</p>}
            {(form.images ?? []).length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {(form.images ?? []).map((src, idx) => (
                  <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={src} alt={`preview-${idx}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeImage(idx)}
                      className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-destructive shadow hover:bg-background">
                      <X className="h-3 w-3" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-primary/90 px-1 py-0.5 text-[10px] text-primary-foreground">
                        Principal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          {/* ── 7. Configurações ───────────────────────────────────────────── */}
          <FormSection title="Configurações" icon={<Settings className="h-4 w-4" />}>
            <div className="space-y-5">
              <Toggle label="Produto ativo" description="Produto visível e disponível para venda"
                checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} />
              <Toggle label="Vender sem estoque" description="Permite venda mesmo quando o estoque estiver zerado"
                checked={form.allowSellWithoutStock ?? true} onChange={(v) => setForm({ ...form, allowSellWithoutStock: v })} />
              <Toggle label="Produto em destaque" description="Exibir em posição de destaque no catálogo"
                checked={form.featured ?? false} onChange={(v) => setForm({ ...form, featured: v })} />
              <div className="space-y-3">
                <Toggle label="Em promoção" description="Exibir preço promocional especial no catálogo"
                  checked={form.onPromotion ?? false} onChange={(v) => setForm({ ...form, onPromotion: v })} />
                {form.onPromotion && (
                  <div className="flex flex-col gap-1.5 border-l-2 border-green-500/40 pl-4 text-sm">
                    <span className="font-medium">Preço promocional</span>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <input type="number" step="0.01" min="0" placeholder="0,00" value={form.promotionPrice ?? ""}
                        onChange={(e) => setForm({ ...form, promotionPrice: e.target.value === "" ? undefined : Number(e.target.value) })}
                        className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 outline-none ring-ring focus:ring-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    </div>
                    {form.promotionPrice != null && form.promotionPrice > 0 && form.promotionPrice >= form.price && (
                      <p className="flex items-center gap-1.5 text-xs text-orange-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Preço promocional maior ou igual ao preço original.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          {/* Feedback */}
          {formErr && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {formErr}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/8 px-4 py-3 text-sm text-green-700">
              <Check className="h-4 w-4 shrink-0" /> Produto salvo com sucesso!
            </div>
          )}

          <div className="flex justify-end gap-2 pb-10">
            <button type="button" onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">
              Cancelar
            </button>
            <button disabled={saved}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saved ? "Salvando…" : initial ? "Salvar alterações" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Nova categoria mini-modal ─────────────────────────────────────── */}
      {newCatOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Nova categoria</h3>
              <button type="button"
                onClick={() => { setNewCatOpen(false); setNewCatErr(""); setNewCatValue(""); }}
                className="rounded p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input autoFocus type="text" placeholder="Nome da categoria" value={newCatValue}
              onChange={(e) => setNewCatValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2" />
            {newCatErr && <p className="mt-1.5 text-xs text-destructive">{newCatErr}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button"
                onClick={() => { setNewCatOpen(false); setNewCatErr(""); setNewCatValue(""); }}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                Cancelar
              </button>
              <button type="button" onClick={handleAddCategory}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ─────────────────────────────────────────────────────────

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function Input(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{props.label}</span>
      <input
        required={props.required ?? true}
        disabled={props.disabled}
        type={props.type ?? "text"}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </label>
  );
}
