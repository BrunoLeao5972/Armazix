/**
 * Server-side store functions.
 * These run exclusively in the server runtime (Cloudflare Workers / Node SSR)
 * and persist store data to the PostgreSQL database.
 */
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db";
import { stores } from "./db/schema";
import { eq } from "drizzle-orm";
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
          .regex(/^[a-z0-9-]+$/, "Slug inválido"),
        description: z.string().max(500).default(""),
        ownerUserId: z.string().uuid("ID de usuário inválido"),
      })
      .parse(data);

    const db = getDb();

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
        ownerUserId: parsed.ownerUserId,
      })
      .returning({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        description: stores.description,
      });

    return store;
  });

export const getStoreBySlugFn = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
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
        createdAt: stores.createdAt,
      })
      .from(stores)
      .where(eq(stores.slug, slug))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      plan: row.plan,
      pdvAccess: row.pdvAccess,
      pdvEnabled: row.pdvEnabled,
      createdAt: row.createdAt.toISOString(),
    };
  });

export const getStoreByOwnerFn = createServerFn({ method: "GET" })
  .inputValidator((ownerUserId: string) => ownerUserId)
  .handler(async ({ data: ownerUserId }) => {
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
        createdAt: stores.createdAt,
      })
      .from(stores)
      .where(eq(stores.ownerUserId, ownerUserId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      plan: row.plan,
      pdvAccess: row.pdvAccess,
      pdvEnabled: row.pdvEnabled,
      createdAt: row.createdAt.toISOString(),
    };
  });

export const getStoreWithProductsBySlugFn = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
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
        createdAt: stores.createdAt,
      })
      .from(stores)
      .where(eq(stores.slug, slug))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      store: {
        id: row.id,
        ownerUserId: row.ownerUserId,
        name: row.name,
        slug: row.slug,
        description: row.description,
        plan: row.plan,
        pdvAccess: row.pdvAccess,
        pdvEnabled: row.pdvEnabled,
        createdAt: row.createdAt.toISOString(),
      },
      products: [],
    };
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
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
        description: z.string().max(500).default(""),
        ownerUserId: z.string().uuid(),
      })
      .parse(data);

    const db = getDb();

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
      ownerUserId: parsed.ownerUserId,
    });

    return { ok: true, message: "Loja sincronizada com sucesso" };
  });

export const persistCustomersToServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async () => {
    return { ok: true };
  });

export const persistOrdersToServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async () => {
    return { ok: true };
  });

export const upsertStoreSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async () => {
    return { ok: true };
  });

export const persistStoreUsersToServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async () => {
    return { ok: true };
  });
