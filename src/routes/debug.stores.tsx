/**
 * ROTA DE DEBUG - Verificar estado do banco de dados
 * 
 * Acesse em desenvolvimento: http://localhost:5173/debug/stores
 * 
 * REMOVER EM PRODUÇÃO!
 */

import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/lib/db";
import { stores } from "@/lib/db/schema";

export const Route = createFileRoute("/debug/stores")({
  head: () => ({
    meta: [
      { title: "Debug - Lojas" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DebugStoresPage,
});

function DebugStoresPage() {
  const [storesList, setStoresList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadStores = async () => {
      try {
        const db = getDb();
        const result = await db.select().from(stores);
        setStoresList(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, []);

  const handleDeleteAll = async () => {
    if (!confirm("⚠️ Deletar TODAS as lojas do banco? Isso é irreversível!")) {
      return;
    }

    try {
      const db = getDb();
      await db.delete(stores);
      setStoresList([]);
      alert("✓ Todas as lojas foram deletadas!");
    } catch (err) {
      alert(
        "Erro ao deletar: " + (err instanceof Error ? err.message : "Desconhecido")
      );
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>🔍 Debug - Banco de Dados</h1>

      <div style={{ marginBottom: "20px" }}>
        <h2>Estado Atual:</h2>
        {loading && <p>Carregando...</p>}
        {error && <p style={{ color: "red" }}>❌ Erro: {error}</p>}
        {!loading && !error && (
          <>
            <p>
              <strong>Total de lojas:</strong> {storesList.length}
            </p>
            {storesList.length === 0 ? (
              <p style={{ color: "green" }}>✓ Banco está vazio!</p>
            ) : (
              <>
                <p style={{ color: "orange" }}>⚠️ Ainda existem lojas:</p>
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    marginBottom: "20px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f0f0f0", borderBottom: "2px solid #ccc" }}>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>ID</th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>Nome</th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>Slug</th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storesList.map((store: any) => (
                      <tr key={store.id} style={{ borderBottom: "1px solid #ddd" }}>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                          {store.id.slice(0, 8)}...
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                          {store.name}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                          {store.slug}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                          {store.ownerUserId.slice(0, 8)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  onClick={handleDeleteAll}
                  style={{
                    padding: "10px 20px",
                    background: "#ff4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  🗑️ Deletar Todas as Lojas
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: "40px", padding: "20px", background: "#f5f5f5" }}>
        <h3>Instruções:</h3>
        <ol>
          <li>Se mostra "Banco está vazio" → problema é no cliente/cache</li>
          <li>Se mostra lojas → clique em "Deletar Todas" ou use SQL direto</li>
          <li>Depois recarregue e tente criar nova loja</li>
        </ol>
        <p style={{ marginTop: "20px", fontSize: "12px", color: "#999" }}>
          ⚠️ Remover esta rota em produção!
        </p>
      </div>
    </div>
  );
}

import React from "react";
