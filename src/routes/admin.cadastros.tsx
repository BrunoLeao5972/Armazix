import { createFileRoute } from "@tanstack/react-router";

import { useMemo, useState } from "react";

import { useTenant } from "@/lib/store";

import { useCurrentStore } from "./admin";

import { Plus, Tag, Trash2 } from "lucide-react";



export const Route = createFileRoute("/admin/cadastros")({

  component: CadastrosPage,

});



function CadastrosPage() {

  const store = useCurrentStore();

  const updateStore = useTenant((s) => s.updateStore);

  const products = useTenant((s) =>

    s.products.filter((p) => p.storeId === store.id),

  );



  const [name, setName] = useState("");

  const [err, setErr] = useState("");



  const categories = useMemo(

    () => (store.categories ?? []).slice().sort((a, b) => a.localeCompare(b)),

    [store.categories],

  );



  const addCategory = () => {

    const clean = normalizeCategory(name);

    if (!clean) {

      setErr("Informe um nome de categoria valido.");

      return;

    }



    const exists = categories.some(

      (category) => normalizeCategory(category) === clean,

    );



    if (exists) {

      setErr("Categoria ja cadastrada.");

      return;

    }



    updateStore(store.id, {

      categories: [...categories, clean],

    });

    setErr("");

    setName("");

  };



  const removeCategory = (category: string) => {

    const inUse = products.some(

      (product) => normalizeCategory(product.category ?? "") === normalizeCategory(category),

    );



    if (inUse) {

      setErr("Nao e possivel remover categoria que ja esta em uso por produtos.");

      return;

    }



    updateStore(store.id, {

      categories: categories.filter(

        (current) => normalizeCategory(current) !== normalizeCategory(category),

      ),

    });

    setErr("");

  };



  return (

    <div className="mx-auto max-w-4xl space-y-6 px-8 py-10">

      <header>

        <h1 className="text-2xl font-bold">Cadastros</h1>

        <p className="text-sm text-muted-foreground">

          Gerencie as categorias de produtos da sua loja.

        </p>

      </header>



      <div className="rounded-2xl border border-border bg-card p-6">

        <h2 className="mb-4 font-semibold">Categorias</h2>



        <div className="flex flex-wrap gap-2">

          <input

            value={name}

            onChange={(e) => setName(e.target.value)}

            placeholder="Ex.: Bebidas"

            className="h-10 min-w-[260px] flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"

          />

          <button

            type="button"

            onClick={addCategory}

            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"

          >

            <Plus className="h-4 w-4" /> Adicionar categoria

          </button>

        </div>



        {err && (

          <p className="mt-2 text-xs font-medium text-destructive">{err}</p>

        )}



        {categories.length === 0 ? (

          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">

            Nenhuma categoria cadastrada ainda.

          </div>

        ) : (

          <ul className="mt-4 space-y-2">

            {categories.map((category) => {

              const count = products.filter(

                (product) =>

                  normalizeCategory(product.category ?? "") === normalizeCategory(category),

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

                    <Trash2 className="h-3.5 w-3.5" /> Remover

                  </button>

                </li>

              );

            })}

          </ul>

        )}

      </div>

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

