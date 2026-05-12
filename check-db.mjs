import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL não configurado");
  process.exit(1);
}

console.log("Conectando ao banco de dados...");
const sql = neon(databaseUrl);

try {
  // Buscar a loja bruno2025
  const stores = await sql`
    SELECT id, name, slug, settings
    FROM stores
    WHERE slug = 'bruno2025'
    LIMIT 1
  `;

  if (stores.length === 0) {
    console.log("❌ Loja 'bruno2025' não encontrada");
    process.exit(1);
  }

  const store = stores[0];
  console.log("✅ Loja encontrada:", {
    id: store.id,
    name: store.name,
    slug: store.slug,
  });

  if (store.settings) {
    console.log("\n📦 Settings da loja:");
    const settings = typeof store.settings === "string" ? JSON.parse(store.settings) : store.settings;
    console.log(JSON.stringify(settings, null, 2));

    if (settings.products) {
      console.log(`\n✨ ${settings.products.length} produtos encontrados`);
      settings.products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} - R$ ${(p.price / 100).toFixed(2)} (Categoria: ${p.category})`);
      });
    } else {
      console.log("\n⚠️  Nenhum produto encontrado nos settings");
    }
  } else {
    console.log("\n⚠️  Settings vazio");
  }
} catch (error) {
  console.error("Erro ao consultar banco de dados:", error);
  process.exit(1);
}
