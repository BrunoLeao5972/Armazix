import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Check, Download, Edit2, Plus, ToggleLeft, ToggleRight, UserCircle, X } from "lucide-react";
import { useAuth, useTenant, hashPassword, type StoreUser } from "@/lib/store";

const USER_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "caixa", label: "Caixa" },
  { value: "gerente", label: "Gerente" },
  { value: "vendedor", label: "Vendedor(a)" },
] as const;

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsuariosPage,
});

function AdminUsuariosPage() {
  const userId = useAuth((s) => s.currentUserId);
  const { stores, storeUsers, addStoreUser, updateStoreUser } = useTenant(
    useShallow((s) => ({
      stores: s.stores,
      storeUsers: s.storeUsers,
      addStoreUser: s.addStoreUser,
      updateStoreUser: s.updateStoreUser,
    })),
  );

  const store = useMemo(
    () => (userId ? stores.find((item) => item.ownerId === userId) : null),
    [stores, userId],
  );
  const storeId = store?.id ?? "";

  const storeUsersList = useMemo(
    () => storeUsers.filter((user) => user.storeId === storeId),
    [storeUsers, storeId],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    password: "",
    fullName: "",
    role: "vendedor" as "admin" | "caixa" | "gerente" | "vendedor",
    active: true,
  });
  const [userErr, setUserErr] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const saveUser = async () => {
    if (!userForm.name.trim() || !userForm.password.trim() || !userForm.fullName.trim()) {
      setUserErr("Informe nome completo, credencial e senha.");
      return;
    }

    const hashedPassword = await hashPassword(userForm.password);

    if (editingUser) {
      updateStoreUser(editingUser, {
        name: userForm.name,
        password: hashedPassword,
        fullName: userForm.fullName,
        role: userForm.role,
        active: userForm.active,
      });
    } else {
      addStoreUser(storeId, {
        name: userForm.name,
        password: hashedPassword,
        fullName: userForm.fullName,
        role: userForm.role,
        active: userForm.active,
      });
    }

    setUserForm({ name: "", password: "", fullName: "", role: "vendedor", active: true });
    setUserErr("");
    setEditingUser(null);
    setIsFormOpen(false);
  };

  const startEditUser = (user: StoreUser) => {
    setUserForm({
      name: user.name,
      password: user.password ?? "",
      fullName: user.fullName ?? "",
      role: normalizeUserRole(user.role),
      active: user.active,
    });
    setEditingUser(user.id);
    setUserErr("");
    setIsFormOpen(true);
  };

  const openCreateUserForm = () => {
    setUserForm({ name: "", password: "", fullName: "", role: "vendedor", active: true });
    setEditingUser(null);
    setUserErr("");
    setIsFormOpen(true);
  };

  const cancelEditUser = () => {
    setUserForm({ name: "", password: "", fullName: "", role: "vendedor", active: true });
    setEditingUser(null);
    setUserErr("");
    setIsFormOpen(false);
  };

  const toggleUserStatus = (user: StoreUser) => {
    updateStoreUser(user.id, { active: !user.active });
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportUsersCsv = () => {
    const header = ["ID", "Nome", "Credencial", "Perfil", "Status"];
    const rows = storeUsersList.map((user, index) => [
      String(index),
      user.fullName || user.name || "",
      user.name,
      normalizeUserRole(user.role),
      user.active ? "Ativado" : "Desativado",
    ]);

    const toCsvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((line) => line.map((cell) => toCsvCell(cell)).join(",")).join("\n");
    downloadFile(`\uFEFF${csv}`, "usuarios.csv", "text/csv;charset=utf-8;");
    setIsExportMenuOpen(false);
  };

  const exportUsersXlsx = () => {
    const header = ["ID", "Nome", "Credencial", "Perfil", "Status"];
    const rows = storeUsersList.map((user, index) => [
      String(index),
      user.fullName || user.name || "",
      user.name,
      normalizeUserRole(user.role),
      user.active ? "Ativado" : "Desativado",
    ]);

    const tableRows = [header, ...rows]
      .map(
        (line) =>
          `<tr>${line
            .map((cell) => `<td>${String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${tableRows}</table></body></html>`;
    downloadFile(html, "usuarios.xls", "application/vnd.ms-excel;charset=utf-8;");
    setIsExportMenuOpen(false);
  };

  const exportUsersPdf = () => {
    const tableRows = storeUsersList
      .map(
        (user, index) => `
          <tr>
            <td>${index}</td>
            <td>${user.fullName || user.name || ""}</td>
            <td>${user.name}</td>
            <td>${normalizeUserRole(user.role)}</td>
            <td>${user.active ? "Ativado" : "Desativado"}</td>
          </tr>
        `,
      )
      .join("");

    const popup = window.open("", "_blank", "width=1024,height=768");
    if (!popup) return;

    popup.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Usuarios</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Relatorio de Usuarios</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Credencial</th>
                <th>Perfil</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
    setIsExportMenuOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-8 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie acessos dos colaboradores em uma pagina dedicada.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            {isExportMenuOpen && (
              <div className="absolute left-0 top-11 z-10 w-40 rounded-md border border-border bg-background p-1 shadow-lg">
                <button
                  type="button"
                  onClick={exportUsersPdf}
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={exportUsersCsv}
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={exportUsersXlsx}
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  XLSX
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openCreateUserForm}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Adicionar usuario
          </button>
        </div>

        {!isFormOpen ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
            <div className="grid grid-cols-[100px_1fr_90px_140px] gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>ID</span>
              <span>Usuario</span>
              <span>Acao</span>
              <span>Status</span>
            </div>
            <ul className="divide-y divide-border">
              {storeUsersList.map((user, index) => (
                <li key={user.id} className="grid grid-cols-[100px_1fr_90px_140px] items-center gap-2 px-4 py-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{index}</span>
                  <span className="font-medium text-foreground">{user.fullName || user.name || (index === 0 ? "Padrao" : "")}</span>
                  <button
                    type="button"
                    onClick={() => startEditUser(user)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Editar usuario"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleUserStatus(user)}
                    className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ${
                      user.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}
                    title={user.active ? "Desativar usuario" : "Ativar usuario"}
                  >
                    {user.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {user.active ? "Ativado" : "Desativado"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <UserCircle className="h-5 w-5 text-primary" />
              {editingUser ? "Editar usuario" : "Cadastrar usuario"}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={editingUser ?? "Gerado automaticamente"}
                readOnly
                placeholder="ID gerado pelo sistema"
                className="h-10 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground outline-none md:col-span-2"
              />
              <input
                value={userForm.fullName}
                onChange={(event) => setUserForm({ ...userForm, fullName: event.target.value })}
                placeholder="Nome Completo *"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2 md:col-span-2"
              />
              <input
                value={userForm.name}
                onChange={(event) => setUserForm({ ...userForm, name: event.target.value })}
                placeholder="Credencial *"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
              />
              <input
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                placeholder="Senha *"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
              />
              <select
                value={userForm.role}
                onChange={(event) =>
                  setUserForm({
                    ...userForm,
                    role: event.target.value as "admin" | "caixa" | "gerente" | "vendedor",
                  })
                }
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
              >
                {USER_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={userForm.active}
                  onChange={(event) => setUserForm({ ...userForm, active: event.target.checked })}
                  className="h-4 w-4"
                />
                Ativo
              </label>
            </div>
            {userErr && <p className="mt-2 text-xs text-destructive">{userErr}</p>}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={saveUser}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Check className="h-4 w-4" />
                {editingUser ? "Salvar" : "Adicionar"}
              </button>
              <button
                type="button"
                onClick={cancelEditUser}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-muted"
              >
                <X className="h-4 w-4" />
                Voltar para lista
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function normalizeUserRole(role: StoreUser["role"]) {
  if (role === "seller") return "vendedor";
  if (role === "viewer") return "caixa";
  if (role === "gerente" || role === "caixa" || role === "admin" || role === "vendedor") {
    return role;
  }
  return "vendedor";
}
