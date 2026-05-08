import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cachedDb) return cachedDb;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada no servidor.");
    throw new Error("Erro de conexão com banco de dados. Tente novamente mais tarde.");
  }

  try {
    const sql = neon(databaseUrl);
    cachedDb = drizzle(sql, { schema });
    return cachedDb;
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
    throw new Error("Erro de conexão com banco de dados. Tente novamente mais tarde.");
  }
}
