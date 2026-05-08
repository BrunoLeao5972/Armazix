/**
 * Helper para acessar variáveis de ambiente em Cloudflare Workers e Node.js
 * Em Cloudflare, injeta via plugin Vite em tempo de build
 * Em Node.js dev, carrega de process.env
 */

// Importar variáveis injetadas pelo plugin Vite em tempo de build
// @ts-ignore - virtual module criado pelo plugin Vite
import { SERVER_ENV } from "virtual:server-env";

function getEnv(key: string): string | undefined {
  // 1. Tenta variáveis injetadas pelo plugin Vite (production)
  if (SERVER_ENV && SERVER_ENV[key]) {
    console.log(`[env] ✓ ${key} encontrado em SERVER_ENV`);
    return SERVER_ENV[key];
  }

  // 2. Tenta process.env (dev/local)
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    const value = process.env[key];
    console.log(`[env] ✓ ${key} encontrado em process.env`);
    return value;
  }

  // 3. Tenta globalThis.env (Cloudflare fallback)
  const globalEnv = (globalThis as any).env;
  if (globalEnv && typeof globalEnv === "object" && globalEnv[key]) {
    const value = globalEnv[key];
    console.log(`[env] ✓ ${key} encontrado em globalThis.env`);
    return value;
  }

  console.warn(`[env] ✗ ${key} não encontrado`);
  return undefined;
}

export function getDatabaseUrl(): string {
  const url = getEnv("DATABASE_URL");
  if (!url) {
    throw new Error("Configuração do banco de dados não encontrada. Contate o suporte.");
  }
  return url;
}

export function getResendApiKey(): string {
  const key = getEnv("RESEND_API_KEY");
  if (!key) {
    throw new Error("Serviço de email não configurado. Contate o suporte.");
  }
  return key;
}

export function getEmailFrom(): string {
  const email = getEnv("EMAIL_FROM");
  if (!email) {
    throw new Error("Remetente de email não configurado. Contate o suporte.");
  }
  return email;
}

export function getAppBaseUrl(): string {
  const url = getEnv("APP_BASE_URL");
  if (!url) {
    throw new Error("URL da aplicação não configurada. Contate o suporte.");
  }
  return url;
}
