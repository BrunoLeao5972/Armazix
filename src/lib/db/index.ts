import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { getDatabaseUrl } from "../env";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cachedDb) return cachedDb;

  try {
    const databaseUrl = getDatabaseUrl();
    const sql = neon(databaseUrl);
    cachedDb = drizzle(sql, { schema });
    return cachedDb;
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
    throw new Error("Erro de conexão com banco de dados. Tente novamente mais tarde.");
  }
}
