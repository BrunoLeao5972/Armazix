/**
 * Server-side auth functions.
 * These run exclusively in the server runtime (Cloudflare Workers / Node SSR)
 * and never expose password hashes to the client.
 */
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db";
import { users, authSessions } from "./db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function hashValue(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const tokenHash = await hashValue(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(authSessions).values({ userId, tokenHash, expiresAt });

  return token;
}

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

type SignupInput = { name: string; email: string; password: string };

export const signupFn = createServerFn({ method: "POST" })
  .inputValidator((data: SignupInput) => data)
  .handler(async ({ data }) => {
    const parsed = z.object({
      name: z.string().min(2).max(100),
      email: z.string().email().max(254),
      password: z.string().min(6).max(100),
    }).parse(data);

    const db = getDb();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Email já cadastrado");
    }

    const passwordHash = await hashValue(parsed.password);

    const [user] = await db
      .insert(users)
      .values({
        name: parsed.name.trim(),
        email: parsed.email.toLowerCase().trim(),
        passwordHash,
      })
      .returning({ id: users.id, name: users.name });

    const sessionToken = await createSession(user.id);

    return { userId: user.id, name: user.name, sessionToken };
  });

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

type LoginInput = { email: string; password: string };

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: LoginInput) => data)
  .handler(async ({ data }) => {
    const parsed = z.object({
      email: z.string().email().max(254),
      password: z.string().max(100),
    }).parse(data);

    const db = getDb();

    const passwordHash = await hashValue(parsed.password);

    const [user] = await db
      .select({ id: users.id, name: users.name, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, parsed.email.toLowerCase()))
      .limit(1);

    if (!user || user.passwordHash !== passwordHash) {
      throw new Error("Credenciais inválidas");
    }

    const sessionToken = await createSession(user.id);

    return { userId: user.id, name: user.name, sessionToken };
  });

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

type LogoutInput = { sessionToken: string };

export const logoutFn = createServerFn({ method: "POST" })
  .inputValidator((data: LogoutInput) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const tokenHash = await hashValue(data.sessionToken);

    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.tokenHash, tokenHash));

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Validate session (used in SSR / beforeLoad)
// ---------------------------------------------------------------------------

type ValidateSessionInput = { sessionToken: string };

export const validateSessionFn = createServerFn({ method: "POST" })
  .inputValidator((data: ValidateSessionInput) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const tokenHash = await hashValue(data.sessionToken);

    const [session] = await db
      .select({
        userId: authSessions.userId,
        userName: users.name,
      })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session) return null;

    return { userId: session.userId, name: session.userName };
  });
