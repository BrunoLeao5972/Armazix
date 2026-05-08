/**
 * Helper para acessar variáveis de ambiente em Cloudflare Workers e Node.js
 */

function getEnv(key: string): string | undefined {
  // Tenta process.env (Node.js, local dev)
  if (typeof process !== "undefined" && process.env && key in process.env) {
    return process.env[key];
  }

  // Tenta globalThis.env (Cloudflare Workers)
  if (typeof globalThis !== "undefined") {
    const env = (globalThis as any).env || {};
    if (key in env) {
      return env[key];
    }
  }

  return undefined;
}

export function getDatabaseUrl(): string {
  const url = getEnv("DATABASE_URL");
  if (!url) {
    throw new Error("DATABASE_URL não configurada");
  }
  return url;
}

export function getResendApiKey(): string {
  const key = getEnv("RESEND_API_KEY");
  if (!key) {
    throw new Error("RESEND_API_KEY não configurada");
  }
  return key;
}

export function getEmailFrom(): string {
  const email = getEnv("EMAIL_FROM");
  if (!email) {
    throw new Error("EMAIL_FROM não configurada");
  }
  return email;
}

export function getAppBaseUrl(): string {
  const url = getEnv("APP_BASE_URL");
  if (!url) {
    throw new Error("APP_BASE_URL não configurada");
  }
  return url;
}
