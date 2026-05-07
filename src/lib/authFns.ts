/**
 * Server-side auth functions.
 * These run exclusively in the server runtime (Cloudflare Workers / Node SSR)
 * and never expose password hashes to the client.
 */
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db";
import { authSessions, emailAuthCodes, users } from "./db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "./email";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const EMAIL_CODE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

type EmailCodePurpose = "verify_email" | "reset_password";

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

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function generateSixDigitCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const value = arr[0] % 1_000_000;
  return value.toString().padStart(6, "0");
}

async function issueEmailCode(userId: string, email: string, purpose: EmailCodePurpose) {
  const db = getDb();
  const code = generateSixDigitCode();
  const codeHash = await hashValue(`${purpose}:${email}:${code}`);
  const expiresAt = new Date(Date.now() + EMAIL_CODE_DURATION_MS);

  await db.insert(emailAuthCodes).values({
    userId,
    email,
    purpose,
    codeHash,
    expiresAt,
  });

  return code;
}

async function sendVerificationEmail(name: string, email: string, code: string) {
  await sendEmail({
    to: email,
    subject: "Armazix: confirme seu e-mail",
    html: `<p>Oi ${name || ""},</p><p>Seu codigo de verificacao e: <strong>${code}</strong></p><p>Ele expira em 10 minutos.</p>`,
  });
}

async function sendPasswordResetEmail(name: string, email: string, code: string) {
  await sendEmail({
    to: email,
    subject: "Armazix: codigo para recuperar senha",
    html: `<p>Oi ${name || ""},</p><p>Seu codigo para redefinir a senha e: <strong>${code}</strong></p><p>Ele expira em 10 minutos.</p>`,
  });
}

async function consumeEmailCode(email: string, purpose: EmailCodePurpose, code: string) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const codeHash = await hashValue(`${purpose}:${normalizedEmail}:${code}`);

  const [record] = await db
    .select({
      id: emailAuthCodes.id,
      userId: emailAuthCodes.userId,
      expiresAt: emailAuthCodes.expiresAt,
      consumedAt: emailAuthCodes.consumedAt,
    })
    .from(emailAuthCodes)
    .where(
      and(
        eq(emailAuthCodes.email, normalizedEmail),
        eq(emailAuthCodes.purpose, purpose),
        eq(emailAuthCodes.codeHash, codeHash),
      ),
    )
    .limit(1);

  if (!record) return null;
  if (record.consumedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;

  await db
    .update(emailAuthCodes)
    .set({ consumedAt: new Date() })
    .where(eq(emailAuthCodes.id, record.id));

  return record;
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

    const normalizedEmail = normalizeEmail(parsed.email);

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Email já cadastrado");
    }

    const passwordHash = await hashValue(parsed.password);

    const [user] = await db
      .insert(users)
      .values({
        name: parsed.name.trim(),
        email: normalizedEmail,
        passwordHash,
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    const code = await issueEmailCode(user.id, user.email, "verify_email");
    await sendVerificationEmail(user.name, user.email, code);

    return { ok: true, requiresEmailVerification: true, email: user.email };
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

    const normalizedEmail = normalizeEmail(parsed.email);

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user || user.passwordHash !== passwordHash) {
      throw new Error("Credenciais inválidas");
    }

    if (!user.emailVerifiedAt) {
      const code = await issueEmailCode(user.id, user.email, "verify_email");
      await sendVerificationEmail(user.name, user.email, code);
      throw new Error("Seu e-mail ainda nao foi verificado. Enviamos um codigo de verificacao.");
    }

    const sessionToken = await createSession(user.id);

    return { userId: user.id, name: user.name, sessionToken };
  });

type RequestEmailCodeInput = { email: string };

export const requestEmailVerificationCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: RequestEmailCodeInput) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const normalizedEmail = normalizeEmail(data.email);

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, emailVerifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user || user.emailVerifiedAt) {
      return { ok: true };
    }

    const code = await issueEmailCode(user.id, user.email, "verify_email");
    await sendVerificationEmail(user.name, user.email, code);
    return { ok: true };
  });

type VerifyEmailCodeInput = { email: string; code: string };

export const verifyEmailCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: VerifyEmailCodeInput) => data)
  .handler(async ({ data }) => {
    const parsed = z
      .object({
        email: z.string().email(),
        code: z.string().regex(/^\d{6}$/),
      })
      .parse(data);

    const db = getDb();
    const normalizedEmail = normalizeEmail(parsed.email);
    const consumed = await consumeEmailCode(normalizedEmail, "verify_email", parsed.code);

    if (!consumed) {
      throw new Error("Codigo invalido ou expirado.");
    }

    const [user] = await db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, consumed.userId), eq(users.email, normalizedEmail)))
      .returning({ id: users.id, name: users.name });

    if (!user) {
      throw new Error("Usuario nao encontrado.");
    }

    const sessionToken = await createSession(user.id);
    return { userId: user.id, name: user.name, sessionToken };
  });

export const requestPasswordResetCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: RequestEmailCodeInput) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const normalizedEmail = normalizeEmail(data.email);

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return { ok: true };
    }

    const code = await issueEmailCode(user.id, user.email, "reset_password");
    await sendPasswordResetEmail(user.name, user.email, code);
    return { ok: true };
  });

type ResetPasswordInput = { email: string; code: string; newPassword: string };

export const resetPasswordWithCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: ResetPasswordInput) => data)
  .handler(async ({ data }) => {
    const parsed = z
      .object({
        email: z.string().email(),
        code: z.string().regex(/^\d{6}$/),
        newPassword: z.string().min(6).max(100),
      })
      .parse(data);

    const db = getDb();
    const normalizedEmail = normalizeEmail(parsed.email);
    const consumed = await consumeEmailCode(normalizedEmail, "reset_password", parsed.code);

    if (!consumed) {
      throw new Error("Codigo invalido ou expirado.");
    }

    const passwordHash = await hashValue(parsed.newPassword);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(and(eq(users.id, consumed.userId), eq(users.email, normalizedEmail)));

    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.userId, consumed.userId), isNull(authSessions.revokedAt)));

    return { ok: true };
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
