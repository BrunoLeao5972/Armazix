import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Check, Download, Edit2, Plus, ToggleLeft, ToggleRight, Users, X } from "lucide-react";
import { useAuth, useTenant, type Customer } from "@/lib/store";

export const Route = createFileRoute("/admin/clientes")({
  component: AdminClientesPage,
});

function AdminClientesPage() {
  const userId = useAuth((s) => s.currentUserId);
  const { stores, customers, addCustomer, updateCustomer } = useTenant(
    useShallow((s) => ({
      stores: s.stores,
      customers: s.customers,
      addCustomer: s.addCustomer,
      updateCustomer: s.updateCustomer,
    })),
  );

  const store = useMemo(
    () => (userId ? stores.find((item) => item.ownerId === userId) : null),
    [stores, userId],
  );
  const storeId = store?.id ?? "";

  const storeCustomers = useMemo(
    () => customers.filter((customer) => customer.storeId === storeId),
    [customers, storeId],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    address: "",
    document: "",
    phone: "",
    email: "",
  });
  const [customerErr, setCustomerErr] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const generalCustomerInitialized = useRef(false);

  useEffect(() => {
    if (!storeId || generalCustomerInitialized.current) return;

    const state = useTenant.getState();
    const hasGeneral = state.customers.some(
      (customer) => customer.storeId === storeId && customer.name.trim().toLowerCase() === "geral",
    );

    if (!hasGeneral) {
      state.addCustomer(storeId, {
        name: "Geral",
        email: "",
        phone: "",
        address: "",
        document: "",
        active: true,
      });
    }

    generalCustomerInitialized.current = true;
  }, [storeId]);

  const saveCustomer = () => {
    if (!customerForm.name.trim() || !customerForm.address.trim() || !customerForm.document.trim()) {
      setCustomerErr("Informe nome completo, endereco completo e CPF/CNPJ.");
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer, {
        name: customerForm.name,
        address: customerForm.address,
        document: customerForm.document,
        phone: customerForm.phone,
        email: customerForm.email,
      });
    } else {
      addCustomer(storeId, {
        name: customerForm.name,
        address: customerForm.address,
        document: customerForm.document,
        email: customerForm.email,
        phone: customerForm.phone,
        active: true,
      });
    }

    setCustomerForm({ name: "", address: "", document: "", phone: "", email: "" });
    setCustomerErr("");
    setEditingCustomer(null);
    setIsFormOpen(false);
  };

  const startEditCustomer = (customer: Customer) => {
    setCustomerForm({
      name: customer.name,
      address: customer.address,
      document: customer.document ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
    });
    setEditingCustomer(customer.id);
    setCustomerErr("");
    setIsFormOpen(true);
  };

  const openCreateCustomerForm = () => {
    setCustomerForm({ name: "", address: "", document: "", phone: "", email: "" });
    setEditingCustomer(null);
    setCustomerErr("");
    setIsFormOpen(true);
  };

  const cancelEditCustomer = () => {
    setCustomerForm({ name: "", address: "", document: "", phone: "", email: "" });
    setEditingCustomer(null);
    setCustomerErr("");
    setIsFormOpen(false);
  };

  const toggleCustomerStatus = (customer: Customer) => {
    updateCustomer(customer.id, { active: !(customer.active ?? true) });
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

  const exportCustomersCsv = () => {
    const header = ["ID", "Nome", "CPF/CNPJ", "Telefone", "Email", "Endereco", "Status"];
    const rows = storeCustomers.map((customer, index) => [
      String(index),
      customer.name,
      customer.document ?? "",
      customer.phone ?? "",
      customer.email ?? "",
      customer.address,
      customer.active ?? true ? "Ativado" : "Desativado",
    ]);

    const toCsvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((line) => line.map((cell) => toCsvCell(cell)).join(",")).join("\n");
    downloadFile(`\uFEFF${csv}`, "clientes.csv", "text/csv;charset=utf-8;");
    setIsExportMenuOpen(false);
  };

  const exportCustomersXlsx = () => {
    const header = ["ID", "Nome", "CPF/CNPJ", "Telefone", "Email", "Endereco", "Status"];
    const rows = storeCustomers.map((customer, index) => [
      String(index),
      customer.name,
      customer.document ?? "",
      customer.phone ?? "",
      customer.email ?? "",
      customer.address,
      customer.active ?? true ? "Ativado" : "Desativado",
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
    downloadFile(html, "clientes.xls", "application/vnd.ms-excel;charset=utf-8;");
    setIsExportMenuOpen(false);
  };

  const exportCustomersPdf = () => {
    const tableRows = storeCustomers
      .map(
        (customer, index) => `
          <tr>
            <td>${index}</td>
            <td>${customer.name}</td>
            <td>${customer.document ?? ""}</td>
            <td>${customer.phone ?? ""}</td>
            <td>${customer.email ?? ""}</td>
            <td>${customer.address}</td>
            <td>${customer.active ?? true ? "Ativado" : "Desativado"}</td>
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
          <title>Clientes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Relatorio de Clientes</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>CPF/CNPJ</th>
                <th>Telefone</th>
                <th>Email</th>
                <th>Endereco</th>
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
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Visualize e gerencie sua base de clientes sem sair do painel.
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
                  onClick={exportCustomersPdf}
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={exportCustomersCsv}
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={exportCustomersXlsx}
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  XLSX
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openCreateCustomerForm}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Adicionar cliente
          </button>
        </div>

        {!isFormOpen ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
            <div className="grid grid-cols-[100px_1fr_90px_140px] gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>ID</span>
              <span>Cliente</span>
              <span>Acao</span>
              <span>Status</span>
            </div>
            <ul className="divide-y divide-border">
              {storeCustomers.map((customer, index) => {
                const active = customer.active ?? true;
                return (
                  <li key={customer.id} className="grid grid-cols-[100px_1fr_90px_140px] items-center gap-2 px-4 py-3 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{index}</span>
                    <span className="font-medium text-foreground">{customer.name}</span>
                    <button
                      type="button"
                      onClick={() => startEditCustomer(customer)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Editar cliente"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCustomerStatus(customer)}
                      className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ${
                        active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}
                      title={active ? "Desativar cliente" : "Ativar cliente"}
                    >
                      {active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      {active ? "Ativado" : "Desativado"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <Users className="h-5 w-5 text-primary" />
              {editingCustomer ? "Editar cliente" : "Cadastrar cliente"}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={editingCustomer ?? "Gerado automaticamente"}
                readOnly
                placeholder="ID gerado pelo sistema"
                className="h-10 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground outline-none md:col-span-2"
              />
              <input
                value={customerForm.name}
                onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
                placeholder="Nome Completo *"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
              />
              <input
                value={customerForm.document}
                onChange={(event) => setCustomerForm({ ...customerForm, document: event.target.value })}
                placeholder="CPF/CNPJ *"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
              />
              <input
                value={customerForm.address}
                onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })}
                placeholder="Endereco Completo *"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2 md:col-span-2"
              />
              <input
                value={customerForm.phone}
                onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
                placeholder="Telefone"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
              />
              <input
                type="email"
                value={customerForm.email}
                onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })}
                placeholder="E-mail"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            {customerErr && <p className="mt-2 text-xs text-destructive">{customerErr}</p>}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={saveCustomer}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Check className="h-4 w-4" />
                {editingCustomer ? "Salvar" : "Adicionar"}
              </button>
              <button
                type="button"
                onClick={cancelEditCustomer}
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
