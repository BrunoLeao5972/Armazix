/**
 * Server-side store functions.
 * These run exclusively in the server runtime (Cloudflare Workers / Node SSR)
 * and persist store data to the PostgreSQL database.
 */
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db";
import { stores } from "./db/schema";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type SerializableSettings = Record<string, JsonValue>;

type StorePayload = {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description: string;
  plan: string;
  pdvAccess: boolean;
  pdvEnabled: boolean;
  settings: SerializableSettings;
};

function toSerializableJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializableJsonValue(item));
  }

  if (value && typeof value === "object") {
    const out: { [key: string]: JsonValue } = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = toSerializableJsonValue(item);
    }
    return out;
  }

  return String(value);
}

function toSerializableSettings(value: unknown): SerializableSettings {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as SerializableSettings;
      }
    } catch {
      return {};
    }
  }

  const jsonValue = toSerializableJsonValue(value);
  if (jsonValue && typeof jsonValue === "object" && !Array.isArray(jsonValue)) {
    return jsonValue as SerializableSettings;
  }
  return {};
}

function mapStorePayload(input: {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description: string;
  plan: string;
  pdvAccess: boolean;
  pdvEnabled: boolean;
  settings: unknown;
}): StorePayload {
  return {
    id: input.id,
    ownerUserId: input.ownerUserId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    plan: input.plan,
    pdvAccess: input.pdvAccess,
    pdvEnabled: input.pdvEnabled,
    settings: toSerializableSettings(input.settings),
  };
}

function isMissingSettingsColumnError(error: unknown) {
  const messages: string[] = [];

  const collectMessages = (value: unknown) => {
    if (!value) return;

    if (value instanceof Error) {
      messages.push(value.message);
      collectMessages((value as Error & { cause?: unknown }).cause);
      return;
    }

    if (typeof value === "string") {
      messages.push(value);
      return;
    }

    if (typeof value === "object") {
      const candidate = value as { message?: unknown; cause?: unknown; toString?: () => string };
      if (typeof candidate.message === "string") {
        messages.push(candidate.message);
      }
      if (typeof candidate.toString === "function") {
        const rendered = candidate.toString();
        if (rendered && rendered !== "[object Object]") {
          messages.push(rendered);
        }
      }
      if (candidate.cause) {
        collectMessages(candidate.cause);
      }
    }
  };

  collectMessages(error);

  const text = messages.join("\n").toLowerCase();

  const hasSettingsToken =
    text.includes("\"settings\"") ||
    text.includes(" settings ") ||
    text.includes("settings does") ||
    text.includes("settings" );

  if (!hasSettingsToken) return false;

  return (
    text.includes("does not exist") ||
    text.includes("nao existe") ||
    text.includes("unknown column") ||
    text.includes("no such column") ||
    text.includes("failed query")
  );
}

export const createStoreFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      slug: string;
      description: string;
      ownerUserId: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const parsed = z
      .object({
        name: z.string().min(1, "Nome é obrigatório").max(100),
        slug: z
          .string()
          .min(1, "Endereço é obrigatório")
          .max(100)
          .regex(/^[a-z0-9]+$/, "Endereço inválido"),
        description: z.string().max(500).default(""),
        ownerUserId: z.string().uuid("ID de usuário inválido"),
      })
      .parse(data);

    const db = getDb();

    // Check if slug is already taken
    const existingSlug = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, parsed.slug))
      .limit(1);

    if (existingSlug.length > 0) {
      throw new Error("Este endereço da loja já está em uso");
    }

    // Check if name is already taken
    const existingName = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.name, parsed.name.trim()))
      .limit(1);

    if (existingName.length > 0) {
      throw new Error("Este nome de loja já está em uso");
    }

    let store: StorePayload | undefined;

    try {
      const [created] = await db
        .insert(stores)
        .values({
          name: parsed.name.trim(),
          slug: parsed.slug,
          description: parsed.description.trim(),
          settings: {},
          ownerUserId: parsed.ownerUserId,
        })
        .returning({
          id: stores.id,
          name: stores.name,
          slug: stores.slug,
          description: stores.description,
          ownerUserId: stores.ownerUserId,
          plan: stores.plan,
          pdvAccess: stores.pdvAccess,
          pdvEnabled: stores.pdvEnabled,
          settings: stores.settings,
        });
      if (created) {
        store = mapStorePayload(created);
      }
    } catch (error) {
      // Handle database constraint violations
      const errorMessage = error instanceof Error ? error.message : "";
      
      if (errorMessage.includes("stores_slug_unique") || errorMessage.includes("slug")) {
        throw new Error("Este endereço da loja já está em uso");
      }
      
      if (errorMessage.includes("stores_name_unique") || errorMessage.includes("name")) {
        throw new Error("Este nome de loja já está em uso");
      }

      if (!isMissingSettingsColumnError(error)) throw error;

      const fallback = await db.execute(sql`
        insert into stores (name, slug, description, owner_user_id)
        values (${parsed.name.trim()}, ${parsed.slug}, ${parsed.description.trim()}, ${parsed.ownerUserId})
        returning id, owner_user_id, name, slug, description, plan, pdv_access, pdv_enabled
      `);

      const row = fallback.rows[0] as {
        id: string;
        owner_user_id: string;
        name: string;
        slug: string;
        description: string;
        plan: string;
        pdv_access: boolean;
        pdv_enabled: boolean;
      } | undefined;

      if (!row) {
        throw new Error("Falha ao criar loja");
      }

      store = {
        id: row.id,
        ownerUserId: row.owner_user_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        plan: row.plan,
        pdvAccess: row.pdv_access,
        pdvEnabled: row.pdv_enabled,
        settings: {},
      };
    }

    return store;
  });

export const getStoreBySlugFn = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const db = getDb();
    try {
      const rows = await db
        .select({
          id: stores.id,
          ownerUserId: stores.ownerUserId,
          name: stores.name,
          slug: stores.slug,
          description: stores.description,
          plan: stores.plan,
          pdvAccess: stores.pdvAccess,
          pdvEnabled: stores.pdvEnabled,
          settings: stores.settings,
        })
        .from(stores)
        .where(eq(stores.slug, slug))
        .limit(1);

      const row = rows[0];
      return row ? mapStorePayload(row) : null;
    } catch (error) {
      if (!isMissingSettingsColumnError(error)) throw error;

      const fallback = await db.execute(sql`
        select id, owner_user_id, name, slug, description, plan, pdv_access, pdv_enabled
        from stores
        where slug = ${slug}
        limit 1
      `);

      const row = fallback.rows[0] as {
        id: string;
        owner_user_id: string;
        name: string;
        slug: string;
        description: string;
        plan: string;
        pdv_access: boolean;
        pdv_enabled: boolean;
      } | undefined;

      if (!row) return null;

      return {
        id: row.id,
        ownerUserId: row.owner_user_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        plan: row.plan,
        pdvAccess: row.pdv_access,
        pdvEnabled: row.pdv_enabled,
        settings: {},
      };
    }
  });

export const getStoreWithProductsBySlugFn = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const store = await getStoreBySlugFn({ data: slug });
    if (!store) return null;

    const settingsData = store.settings && typeof store.settings === "object"
      ? (store.settings as Record<string, unknown>)
      : {};

    const productsFromSettings = Array.isArray(settingsData.products)
      ? settingsData.products
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => {
            const parsedCode = Number(item.code ?? 0);
            const parsedPrice = Number(item.price ?? 0);
            const parsedStock = Number(item.stock ?? 0);
            const parsedMinStock = Number(item.minStock ?? 0);

            return {
              id: typeof item.id === "string" && item.id ? item.id : "",
              storeId: store.id,
              code: Number.isFinite(parsedCode) ? parsedCode : 0,
              name: typeof item.name === "string" ? item.name : "",
              description: typeof item.description === "string" ? item.description : "",
              price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
              stock: Number.isFinite(parsedStock) ? parsedStock : 0,
              unit: typeof item.unit === "string" && item.unit ? item.unit : "UN",
              minStock: Number.isFinite(parsedMinStock) ? parsedMinStock : 0,
              category: typeof item.category === "string" ? item.category : "",
              imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
              images: Array.isArray(item.images) ? item.images.filter((img): img is string => typeof img === "string") : undefined,
              active: typeof item.active === "boolean" ? item.active : true,
              featured: typeof item.featured === "boolean" ? item.featured : false,
              onPromotion: typeof item.onPromotion === "boolean" ? item.onPromotion : false,
              promotionPrice: typeof item.promotionPrice === "number" ? item.promotionPrice : null,
              variations: Array.isArray(item.variations) ? item.variations : undefined,
            };
          })
      : [];

    return {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        logoUrl: settingsData.logoUrl ?? null,
        phones: settingsData.phones ?? undefined,
        whatsapp: settingsData.whatsapp ?? null,
        address: settingsData.address ?? null,
        addressInfo: settingsData.addressInfo ?? undefined,
        businessHours: settingsData.businessHours ?? undefined,
        delivery: settingsData.delivery ?? null,
        payments: settingsData.payments ?? null,
        banners: settingsData.banners ?? null,
        categories: settingsData.categories ?? undefined,
        plan: store.plan,
      },
      products: productsFromSettings,
    };
  });

export const getStoreByOwnerFn = createServerFn({ method: "GET" })
  .inputValidator((ownerUserId: string) => ownerUserId)
  .handler(async ({ data: ownerUserId }) => {
    const parsedOwner = z.string().uuid("ID de usuário inválido").parse(ownerUserId);
    const db = getDb();
    try {
      const rows = await db
        .select({
          id: stores.id,
          ownerUserId: stores.ownerUserId,
          name: stores.name,
          slug: stores.slug,
          description: stores.description,
          plan: stores.plan,
          pdvAccess: stores.pdvAccess,
          pdvEnabled: stores.pdvEnabled,
          settings: stores.settings,
        })
        .from(stores)
        .where(eq(stores.ownerUserId, parsedOwner))
        .limit(1);

      const row = rows[0];
      return row ? mapStorePayload(row) : null;
    } catch (error) {
      if (!isMissingSettingsColumnError(error)) throw error;

      const fallback = await db.execute(sql`
        select id, owner_user_id, name, slug, description, plan, pdv_access, pdv_enabled
        from stores
        where owner_user_id = ${parsedOwner}
        limit 1
      `);

      const row = fallback.rows[0] as {
        id: string;
        owner_user_id: string;
        name: string;
        slug: string;
        description: string;
        plan: string;
        pdv_access: boolean;
        pdv_enabled: boolean;
      } | undefined;

      if (!row) return null;

      return {
        id: row.id,
        ownerUserId: row.owner_user_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        plan: row.plan,
        pdvAccess: row.pdv_access,
        pdvEnabled: row.pdv_enabled,
        settings: {},
      };
    }
  });

export const upsertStoreSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      storeId: string;
      ownerUserId: string;
      name: string;
      slug: string;
      description: string;
      settings: Record<string, unknown>;
    }) => data,
  )
  .handler(async ({ data }) => {
    const parsed = z
      .object({
        storeId: z.string().uuid("ID da loja inválido"),
        ownerUserId: z.string().uuid("ID de usuário inválido"),
        name: z.string().min(1, "Nome é obrigatório").max(100),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9]+$/, "Endereço inválido"),
        description: z.string().max(500).default(""),
        settings: z.record(z.any()).default({}),
      })
      .parse(data);

    const db = getDb();

    const conflict = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, parsed.slug))
      .limit(1);

    if (conflict.length > 0 && conflict[0].id !== parsed.storeId) {
      throw new Error("Este endereço da loja já está em uso");
    }

    const existing = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.id, parsed.storeId), eq(stores.ownerUserId, parsed.ownerUserId)))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Loja não encontrada para este usuário");
    }

    try {
      const [updated] = await db
        .update(stores)
        .set({
          name: parsed.name.trim(),
          slug: parsed.slug,
          description: parsed.description.trim(),
          settings: parsed.settings,
        })
        .where(eq(stores.id, parsed.storeId))
        .returning({
          id: stores.id,
          ownerUserId: stores.ownerUserId,
          name: stores.name,
          slug: stores.slug,
          description: stores.description,
          plan: stores.plan,
          pdvAccess: stores.pdvAccess,
          pdvEnabled: stores.pdvEnabled,
          settings: stores.settings,
        });

      if (!updated) {
        throw new Error("Falha ao atualizar loja");
      }

      return mapStorePayload(updated);
    } catch (error) {
      if (!isMissingSettingsColumnError(error)) throw error;

      const fallback = await db.execute(sql`
        update stores
        set name = ${parsed.name.trim()}, slug = ${parsed.slug}, description = ${parsed.description.trim()}
        where id = ${parsed.storeId}
        returning id, owner_user_id, name, slug, description, plan, pdv_access, pdv_enabled
      `);

      const row = fallback.rows[0] as {
        id: string;
        owner_user_id: string;
        name: string;
        slug: string;
        description: string;
        plan: string;
        pdv_access: boolean;
        pdv_enabled: boolean;
      } | undefined;

      if (!row) {
        throw new Error("Falha ao atualizar loja");
      }

      return {
        id: row.id,
        ownerUserId: row.owner_user_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        plan: row.plan,
        pdvAccess: row.pdv_access,
        pdvEnabled: row.pdv_enabled,
        settings: {},
      };
    }
  });

export const syncStoreToDbFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      slug: string;
      description: string;
      ownerUserId: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const parsed = z
      .object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9]+$/),
        description: z.string().max(500).default(""),
        ownerUserId: z.string().uuid(),
      })
      .parse(data);

    const db = getDb();

    // Check if already exists
    const existing = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, parsed.slug))
      .limit(1);

    if (existing.length > 0) {
      return { ok: true, message: "Loja já existe no servidor" };
    }

    try {
      await db.insert(stores).values({
        name: parsed.name.trim(),
        slug: parsed.slug,
        description: parsed.description.trim(),
        settings: {},
        ownerUserId: parsed.ownerUserId,
      });
    } catch (error) {
      if (!isMissingSettingsColumnError(error)) throw error;

      await db.execute(sql`
        insert into stores (name, slug, description, owner_user_id)
        values (${parsed.name.trim()}, ${parsed.slug}, ${parsed.description.trim()}, ${parsed.ownerUserId})
      `);
    }

    return { ok: true, message: "Loja sincronizada com sucesso" };
  });

export const persistOrdersToServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      storeId: string;
      ownerUserId: string;
      orders: unknown[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const parsed = z
      .object({
        storeId: z.string().uuid("ID da loja inválido"),
        ownerUserId: z.string().uuid("ID de usuário inválido"),
        orders: z.array(z.any()).default([]),
      })
      .parse(data);

    const db = getDb();
    const existing = await db
      .select({ id: stores.id, settings: stores.settings })
      .from(stores)
      .where(
        and(
          eq(stores.id, parsed.storeId),
          eq(stores.ownerUserId, parsed.ownerUserId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Loja não encontrada para este usuário");
    }

    const currentSettings = toSerializableSettings(existing[0].settings);
    const updatedSettings = {
      ...currentSettings,
      orders: parsed.orders,
    };

    try {
      const [updated] = await db
        .update(stores)
        .set({ settings: updatedSettings })
        .where(eq(stores.id, parsed.storeId))
        .returning({
          id: stores.id,
          ownerUserId: stores.ownerUserId,
          name: stores.name,
          slug: stores.slug,
          description: stores.description,
          plan: stores.plan,
          pdvAccess: stores.pdvAccess,
          pdvEnabled: stores.pdvEnabled,
          settings: stores.settings,
        });

      if (!updated) {
        throw new Error("Falha ao atualizar pedidos");
      }

      return mapStorePayload(updated);
    } catch (error) {
      if (!isMissingSettingsColumnError(error)) throw error;
      throw new Error("Coluna de configurações não encontrada");
    }
  });

export const persistCustomersToServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      storeId: string;
      ownerUserId: string;
      customers: unknown[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const parsed = z
      .object({
        storeId: z.string().uuid("ID da loja inválido"),
        ownerUserId: z.string().uuid("ID de usuário inválido"),
        customers: z.array(z.any()).default([]),
      })
      .parse(data);

    const db = getDb();
    const existing = await db
      .select({ id: stores.id, settings: stores.settings })
      .from(stores)
      .where(
        and(
          eq(stores.id, parsed.storeId),
          eq(stores.ownerUserId, parsed.ownerUserId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Loja não encontrada para este usuário");
    }

    const currentSettings = toSerializableSettings(existing[0].settings);
    const updatedSettings = {
      ...currentSettings,
      customers: parsed.customers,
    };

    try {
      const [updated] = await db
        .update(stores)
        .set({ settings: updatedSettings })
        .where(eq(stores.id, parsed.storeId))
        .returning({
          id: stores.id,
          ownerUserId: stores.ownerUserId,
          name: stores.name,
          slug: stores.slug,
          description: stores.description,
          plan: stores.plan,
          pdvAccess: stores.pdvAccess,
          pdvEnabled: stores.pdvEnabled,
          settings: stores.settings,
        });

      if (!updated) {
        throw new Error("Falha ao atualizar clientes");
      }

      return mapStorePayload(updated);
    } catch (error) {
      if (!isMissingSettingsColumnError(error)) throw error;
      throw new Error("Coluna de configurações não encontrada");
    }
  });

export const persistPaymentMethodsToServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      storeId: string;
      ownerUserId: string;
      paymentMethods: unknown[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const parsed = z
      .object({
        storeId: z.string().uuid("ID da loja inválido"),
        ownerUserId: z.string().uuid("ID de usuário inválido"),
        paymentMethods: z.array(z.any()).default([]),
      })
      .parse(data);

    const db = getDb();
    const existing = await db
      .select({ id: stores.id, settings: stores.settings })
      .from(stores)
      .where(
        and(
          eq(stores.id, parsed.storeId),
          eq(stores.ownerUserId, parsed.ownerUserId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Loja não encontrada para este usuário");
    }

    const currentSettings = toSerializableSettings(existing[0].settings);
    const updatedSettings = {
      ...currentSettings,
      paymentMethods: parsed.paymentMethods,
    };

    try {
      const [updated] = await db
        .update(stores)
        .set({ settings: updatedSettings })
        .where(eq(stores.id, parsed.storeId))
        .returning({
          id: stores.id,
          ownerUserId: stores.ownerUserId,
          name: stores.name,
          slug: stores.slug,
          description: stores.description,
          plan: stores.plan,
          pdvAccess: stores.pdvAccess,
          pdvEnabled: stores.pdvEnabled,
          settings: stores.settings,
        });

      if (!updated) {
        throw new Error("Falha ao atualizar métodos de pagamento");
      }

      return mapStorePayload(updated);
    } catch (error) {
      if (!isMissingSettingsColumnError(error)) throw error;
      throw new Error("Coluna de configurações não encontrada");
    }
  });

export const persistStoreUsersToServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      storeId: string;
      ownerUserId: string;
      storeUsers: unknown[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const parsed = z
      .object({
        storeId: z.string().uuid("ID da loja inválido"),
        ownerUserId: z.string().uuid("ID de usuário inválido"),
        storeUsers: z.array(z.any()).default([]),
      })
      .parse(data);

    const db = getDb();
    const existing = await db
      .select({ id: stores.id, settings: stores.settings })
      .from(stores)
      .where(
        and(
          eq(stores.id, parsed.storeId),
          eq(stores.ownerUserId, parsed.ownerUserId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Loja não encontrada para este usuário");
    }

    const currentSettings = toSerializableSettings(existing[0].settings);
    const updatedSettings = {
      ...currentSettings,
      storeUsers: parsed.storeUsers,
    };

    try {
      const [updated] = await db
        .update(stores)
        .set({ settings: updatedSettings })
        .where(eq(stores.id, parsed.storeId))
        .returning({
          id: stores.id,
          ownerUserId: stores.ownerUserId,
          name: stores.name,
          slug: stores.slug,
          description: stores.description,
          plan: stores.plan,
          pdvAccess: stores.pdvAccess,
          pdvEnabled: stores.pdvEnabled,
          settings: stores.settings,
        });

      if (!updated) {
        throw new Error("Falha ao atualizar usuários da loja");
      }

      return mapStorePayload(updated);
    } catch (error) {
      if (!isMissingSettingsColumnError(error)) throw error;
      throw new Error("Coluna de configurações não encontrada");
    }
  });
