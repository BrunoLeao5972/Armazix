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
          .min(1, "Slug é obrigatório")
          .max(100)
          .regex(/^[a-z0-9]+$/, "Slug inválido"),
        description: z.string().max(500).default(""),
        ownerUserId: z.string().uuid("ID de usuário inválido"),
      })
      .parse(data);

    const db = getDb();

    // Check if slug is already taken
    const existing = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, parsed.slug))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Slug já em uso");
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
        slug: z.string().min(1).max(100).regex(/^[a-z0-9]+$/, "Slug inválido"),
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
      throw new Error("Slug já em uso");
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
