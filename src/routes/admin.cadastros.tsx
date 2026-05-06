import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Package, Plus, Tag, Trash2, Users, UserCircle } from "lucide-react";
import { useAuth, useTenant } from "@/lib/store";

export const Route = createFileRoute("/admin/cadastros")({
  component: CadastrosPage,
});

function CadastrosPage() {
  const userId = useAuth((s) => s.currentUserId);
  const { stores, products, updateStore } = useTenant(
    useShallow((s) => ({
      stores: s.stores,
      products: s.products,
      updateStore: s.updateStore,
    })),
  );

  const store = useMemo(
    () => (userId ? stores.find((item) => item.ownerId === userId) : null),
    [stores, userId],
  );
  const storeId = store?.id ?? "";
  const categoriesRaw = store?.categories ?? [];
  const categories = useMemo(
    () => [...categoriesRaw].sort((a, b) => a.localeCompare(b)),
    [categoriesRaw],
  );
  const storeProducts = useMemo(
    () => products.filter((product) => product.storeId === storeId),
    [products, storeId],
  );

  const [categoryName, setCategoryName] = useState("");
  const [categoryErr, setCategoryErr] = useState("");

  const addCategory = () => {
    const clean = normalizeCategory(categoryName);
    if (!clean) {
      setCategoryErr("Informe um nome de categoria valido.");
      return;
    }

    const exists = categories.some((category) => normalizeCategory(category) === clean);
    if (exists) {
      setCategoryErr("Categoria ja cadastrada.");
      return;
    }

    updateStore(storeId, { categories: [...categories, clean] });
    setCategoryErr("");
    setCategoryName("");
  };

  const removeCategory = (category: string) => {
    const inUse = storeProducts.some(
      (product) => normalizeCategory(product.category ?? "") === normalizeCategory(category),
    );
    if (inUse) {
      setCategoryErr("Nao e possivel remover categoria em uso.");
      return;
    }

    updateStore(storeId, {
      categories: categories.filter(
        (currentCategory) => normalizeCategory(currentCategory) !== normalizeCategory(category),
      ),
    });
    setCategoryErr("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-8 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Cadastros</h1>
        <p className="text-sm text-muted-foreground">
          Area dedicada para categorias e atalhos para outras paginas administrativas.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          to="/admin/clientes"
          className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/30 hover:bg-primary/5"
        >
          <Users className="h-6 w-6 text-primary" />
          <h2 className="mt-4 font-semibold text-foreground">Clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Abrir pagina dedicada de clientes.</p>
        </Link>

        <Link
          to="/admin/produtos"
          className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/30 hover:bg-primary/5"
        >
          <Package className="h-6 w-6 text-primary" />
          <h2 className="mt-4 font-semibold text-foreground">Cadastro de Produtos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Abrir pagina exclusiva de produtos.</p>
        </Link>

        <Link
          to="/admin/usuarios"
          className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/30 hover:bg-primary/5"
        >
          <UserCircle className="h-6 w-6 text-primary" />
          <h2 className="mt-4 font-semibold text-foreground">Usuarios</h2>
          <p className="mt-1 text-sm text-muted-foreground">Abrir pagina exclusiva de usuarios.</p>
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
          <Tag className="h-5 w-5 text-primary" />
          Categorias
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Ex.: Bebidas"
            className="h-10 min-w-[260px] flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
          />
          <button
            type="button"
            onClick={addCategory}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
        {categoryErr && <p className="mt-2 text-xs font-medium text-destructive">{categoryErr}</p>}
        {categories.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {categories.map((category) => {
              const count = storeProducts.filter(
                (product) => normalizeCategory(product.category ?? "") === normalizeCategory(category),
              ).length;
              return (
                <li
                  key={category}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{category}</span>
                    <span className="text-xs text-muted-foreground">
                      ({count} produto{count === 1 ? "" : "s"})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function normalizeCategory(value: string | undefined | null) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^\w)|\s(\w)/g, (match) => match.toUpperCase());
}
