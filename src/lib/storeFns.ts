/**
 * Server-side store functions.
 * These run exclusively in the server runtime (Cloudflare Workers / Node SSR)
 * and persist store data to the PostgreSQL database.
 */
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db";
import { stores } from "./db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

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

    const [store] = await db
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

    return store;
  });

export const getStoreBySlugFn = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(stores)
      .where(eq(stores.slug, slug))
      .limit(1);

    return rows[0] ?? null;
  });

export const getStoreByOwnerFn = createServerFn({ method: "GET" })
  .inputValidator((ownerUserId: string) => ownerUserId)
  .handler(async ({ data: ownerUserId }) => {
    const parsedOwner = z.string().uuid("ID de usuário inválido").parse(ownerUserId);
    const db = getDb();
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

    return rows[0] ?? null;
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

    return updated;
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

    await db.insert(stores).values({
      name: parsed.name.trim(),
      slug: parsed.slug,
      description: parsed.description.trim(),
      settings: {},
      ownerUserId: parsed.ownerUserId,
    });

    return { ok: true, message: "Loja sincronizada com sucesso" };
  });
