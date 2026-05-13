import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Plan, PLAN_LIMITS } from "./plans";

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

/**
 * Multi-tenant mock data layer.
 *
 * In a real backend (Cloudflare Workers / Postgres), every table below would carry
 * a `store_id` column and be protected by RLS so a user can only read/write
 * rows where store_id == their store. Here we simulate that isolation by
 * filtering everything through `storeId` in selectors.
 */

export type User = {
  id: string;
  name: string;
  email: string;
  password: string; // mock only
  storeId: string | null;
};

export type BusinessHour = {
  day: string;
  open: string;
  close: string;
  closed: boolean;
};

export type DeliveryFee = {
  label: string;
  fee: number;
};

export type AddressInfo = {
  cep: string;
  street: string;
  number: string;
  city: string;
  state: string;
  complement: string;
};

export type Store = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  taxId: string;
  cnpj: string;
  address: string;
  addressInfo: AddressInfo;
  description: string;
  businessHours: BusinessHour[];
  phones: string[];
  whatsapp: string;
  categories: string[];
  delivery: {
    pickup: boolean;
    localDelivery: boolean;
    fee: number;
    fees: DeliveryFee[];
  };
  payments: {
    pix: boolean;
    card: boolean;
    cash: boolean;
    credit: boolean;
    debit: boolean;
    pixKeyType: PixKeyType;
    pixBank: string;
    pixKey: string;
    pixReceiverName: string;
    pixReceiverDocument: string;
    pixQrCode: string;
  };
  plan: Plan;
  pdvAccess: boolean;
  pdvEnabled: boolean;
  createdAt: number;
};

export type Product = {
  id: string;
  storeId: string;
  code: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: string; // emoji fallback
  imageUrl?: string; // optional product photo URL
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  storeId: string;
  customer: { name: string; email: string; phone: string; address: string };
  items: OrderItem[];
  total: number;
  paymentMethod: "pix" | "card" | "cash" | "credit" | "debit";
  deliveryMethod: "pickup" | "delivery";
  deliveryZone?: string;
  cashChange?: {
    needsChange: boolean;
    changeFor: number | null;
    change: number;
  };
  status: "pending" | "paid" | "shipped" | "delivered";
  createdAt: number;
};

const DEFAULT_BUSINESS_HOURS: BusinessHour[] = [
  { day: "Segunda-feira", open: "08:00", close: "18:00", closed: false },
  { day: "Terca-feira", open: "08:00", close: "18:00", closed: false },
  { day: "Quarta-feira", open: "08:00", close: "18:00", closed: false },
  { day: "Quinta-feira", open: "08:00", close: "18:00", closed: false },
  { day: "Sexta-feira", open: "08:00", close: "18:00", closed: false },
  { day: "Sabado", open: "08:00", close: "13:00", closed: false },
  { day: "Domingo", open: "08:00", close: "12:00", closed: true },
];

const DEFAULT_ADDRESS_INFO: AddressInfo = {
  cep: "",
  street: "",
  number: "",
  city: "",
  state: "",
  complement: "",
};

const DEFAULT_DELIVERY_FEES: DeliveryFee[] = [
  { label: "Entrega padrao", fee: 0 },
];

export function normalizeStore(store: Store): Store {
  const rawBusinessHours = store.businessHours ?? [];
  const rawFees = store.delivery?.fees ?? [];

  return {
    ...store,
    taxId: store.taxId ?? store.cnpj ?? "",
    cnpj: store.cnpj ?? "",
    phones: Array.isArray(store.phones)
      ? store.phones.filter((p) => p.trim().length > 0)
      : store.whatsapp
        ? [store.whatsapp]
        : [""],
    address: store.address ?? "",
    addressInfo: {
      cep: store.addressInfo?.cep ?? "",
      street: store.addressInfo?.street ?? "",
      number: store.addressInfo?.number ?? "",
      city: store.addressInfo?.city ?? "",
      state: store.addressInfo?.state ?? "",
      complement: store.addressInfo?.complement ?? "",
    },
    description: store.description ?? "",
    businessHours:
      rawBusinessHours.length > 0
        ? rawBusinessHours.map((h) => ({
            day: h.day,
            open: h.open,
            close: h.close,
            closed: h.closed,
          }))
        : DEFAULT_BUSINESS_HOURS.map((h) => ({ ...h })),
    whatsapp: store.whatsapp ?? "",
    categories: Array.isArray(store.categories)
      ? store.categories.filter((c) => c.trim().length > 0)
      : [],
    delivery: {
      pickup: store.delivery?.pickup ?? true,
      localDelivery: store.delivery?.localDelivery ?? false,
      fee: Number(store.delivery?.fee ?? 0),
      fees:
        rawFees.length > 0
          ? rawFees.map((f) => ({
              label: f.label,
              fee: Number(f.fee),
            }))
          : DEFAULT_DELIVERY_FEES.map((f) => ({ ...f })),
    },
    payments: {
      pix: store.payments?.pix ?? true,
      card: store.payments?.card ?? true,
      cash: store.payments?.cash ?? false,
      credit: store.payments?.credit ?? (store.payments?.card ?? true),
      debit: store.payments?.debit ?? (store.payments?.card ?? true),
      pixKeyType: store.payments?.pixKeyType ?? "random",
      pixBank: store.payments?.pixBank ?? "",
      pixKey: store.payments?.pixKey ?? "",
      pixReceiverName: store.payments?.pixReceiverName ?? "",
      pixReceiverDocument: store.payments?.pixReceiverDocument ?? "",
      pixQrCode: store.payments?.pixQrCode ?? "",
    },
    pdvAccess: store.pdvAccess ?? false,
    pdvEnabled: store.pdvEnabled ?? false,
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);

// --- Auth -------------------------------------------------------------------

type AuthState = {
  users: User[];
  currentUserId: string | null;
  signup: (data: { name: string; email: string; password: string }) =>
    | { ok: true; userId: string }
    | { ok: false; error: string };
  login: (email: string, password: string) =>
    | { ok: true; userId: string }
    | { ok: false; error: string };
  setCurrentUser: (userId: string | null) => void;
  logout: () => void;
  attachStore: (userId: string, storeId: string) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      signup: ({ name, email, password }) => {
        const exists = get().users.find((u) => u.email === email);
        if (exists) return { ok: false, error: "Email já cadastrado" };
        const user: User = { id: uid(), name, email, password, storeId: null };
        set({ users: [...get().users, user], currentUserId: user.id });
        return { ok: true, userId: user.id };
      },
      login: (email, password) => {
        const u = get().users.find(
          (x) => x.email === email && x.password === password,
        );
        if (!u) return { ok: false, error: "Credenciais inválidas" };
        set({ currentUserId: u.id });
        return { ok: true, userId: u.id };
      },
      logout: () => set({ currentUserId: null }),
      setCurrentUser: (userId) => set({ currentUserId: userId }),
      attachStore: (userId, storeId) =>
        set({
          users: get().users.map((u) =>
            u.id === userId ? { ...u, storeId } : u,
          ),
        }),
    }),
    { name: "ms-auth" },
  ),
);

// --- Tenants (Stores) -------------------------------------------------------

type TenantState = {
  stores: Store[];
  products: Product[];
  orders: Order[];
  createStore: (
    ownerId: string,
    data: { name: string; slug: string; description: string },
  ) => { ok: true; storeId: string } | { ok: false; error: string };
  updateStore: (storeId: string, patch: Partial<Store>) => void;
  upgradePlan: (storeId: string, plan: Plan) => void;
  upsertStoreFromServer: (store: Partial<Store> & { id: string; ownerId: string; name: string; slug: string }) => void;
  // products
  addProduct: (storeId: string, p: Omit<Product, "id" | "storeId" | "code">) => { ok: boolean; error?: string };
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  // orders
  createOrder: (
    storeId: string,
    data: Omit<Order, "id" | "storeId" | "status" | "createdAt">,
  ) => string;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
};

export const useTenant = create<TenantState>()(
  persist(
    (set, get) => ({
      stores: [],
      products: [],
      orders: [],
      createStore: (ownerId, { name, slug, description }) => {
        const cleanSlug = slug
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        if (!cleanSlug) return { ok: false, error: "Slug inválido" };
        if (get().stores.find((s) => s.slug === cleanSlug))
          return { ok: false, error: "Slug já em uso" };
        const store: Store = {
          id: uid(),
          ownerId,
          name,
          slug: cleanSlug,
              taxId: "",
          cnpj: "",
          address: "",
              addressInfo: { ...DEFAULT_ADDRESS_INFO },
          description,
          businessHours: DEFAULT_BUSINESS_HOURS.map((h) => ({ ...h })),
              phones: [""],
          whatsapp: "",
          categories: [],
          delivery: {
            pickup: true,
            localDelivery: false,
            fee: 0,
            fees: DEFAULT_DELIVERY_FEES.map((f) => ({ ...f })),
          },
          payments: {
            pix: true,
            card: true,
            cash: false,
            credit: true,
            debit: true,
            pixKeyType: "random",
            pixBank: "",
            pixKey: "",
            pixReceiverName: "",
            pixReceiverDocument: "",
            pixQrCode: "",
          },
          plan: "free",
          pdvAccess: false,
          pdvEnabled: false,
          createdAt: Date.now(),
        };
        set({ stores: [...get().stores, store] });
        return { ok: true, storeId: store.id };
      },
      updateStore: (storeId, patch) =>
        set({
          stores: get().stores.map((s) =>
            s.id === storeId ? { ...s, ...patch } : s,
          ),
        }),
      upgradePlan: (storeId, plan) =>
        set({
          stores: get().stores.map((s) =>
            s.id === storeId ? { ...s, plan } : s,
          ),
        }),
      upsertStoreFromServer: (serverStore) => {
        const existing = get().stores.find((s) => s.id === serverStore.id);
        if (existing) {
          set({
            stores: get().stores.map((s) =>
              s.id === serverStore.id ? { ...s, ...serverStore } : s,
            ),
          });
        } else {
          const newStore: Store = {
            id: serverStore.id,
            ownerId: serverStore.ownerId,
            name: serverStore.name,
            slug: serverStore.slug,
            taxId: "",
            cnpj: "",
            address: "",
            addressInfo: { ...DEFAULT_ADDRESS_INFO },
            description: serverStore.description ?? "",
            businessHours: DEFAULT_BUSINESS_HOURS.map((h) => ({ ...h })),
            phones: [""],
            whatsapp: "",
            categories: [],
            delivery: {
              pickup: true,
              localDelivery: false,
              fee: 0,
              fees: DEFAULT_DELIVERY_FEES.map((f) => ({ ...f })),
            },
            payments: {
              pix: true,
              card: true,
              cash: false,
              credit: true,
              debit: true,
              pixKeyType: "random",
              pixBank: "",
              pixKey: "",
              pixReceiverName: "",
              pixReceiverDocument: "",
              pixQrCode: "",
            },
            plan: (serverStore.plan as Plan) ?? "free",
            pdvAccess: serverStore.pdvAccess ?? false,
            pdvEnabled: serverStore.pdvEnabled ?? false,
            createdAt: Date.now(),
          };
          set({ stores: [...get().stores, newStore] });
        }
      },
      addProduct: (storeId, p) => {
        const store = get().stores.find((s) => s.id === storeId);
        const plan: Plan = store?.plan ?? "free";
        const limit = PLAN_LIMITS[plan];
        const productsOfStore = get().products.filter((x) => x.storeId === storeId);
        const count = productsOfStore.length;
        if (count >= limit) {
          return { ok: false, error: `Limite de ${limit} produtos do plano ${plan} atingido.` };
        }

        const lastCode = productsOfStore.reduce(
          (max, product) => Math.max(max, Number(product.code) || 0),
          0,
        );
        const nextCode = lastCode + 1;

        set({ products: [...get().products, { ...p, code: nextCode, id: uid(), storeId }] });
        return { ok: true };
      },
      updateProduct: (id, patch) =>
        set({
          products: get().products.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        }),
      removeProduct: (id) =>
        set({ products: get().products.filter((p) => p.id !== id) }),
      createOrder: (storeId, data) => {
        const id = uid();
        const order: Order = {
          ...data,
          id,
          storeId,
          status: "pending",
          createdAt: Date.now(),
        };
        set({ orders: [...get().orders, order] });
        return id;
      },
      updateOrderStatus: (id, status) =>
        set({
          orders: get().orders.map((o) =>
            o.id === id ? { ...o, status } : o,
          ),
        }),
    }),
    { name: "ms-tenant" },
  ),
);

// --- Selectors with tenant isolation ----------------------------------------

export const selectStoreBySlug = (slug: string) =>
  useTenant.getState().stores.find((s) => s.slug === slug);

export const selectStoreOfUser = (userId: string | null) => {
  if (!userId) return null;
  return useTenant.getState().stores.find((s) => s.ownerId === userId) ?? null;
};

export const selectProductsOfStore = (storeId: string) =>
  useTenant.getState().products.filter((p) => p.storeId === storeId);

export const selectOrdersOfStore = (storeId: string) =>
  useTenant.getState().orders.filter((o) => o.storeId === storeId);

export const selectPlanUsage = (storeId: string) => {
  const state = useTenant.getState();
  const store = state.stores.find((s) => s.id === storeId);
  const plan: Plan = store?.plan ?? "free";
  const count = state.products.filter((p) => p.storeId === storeId).length;
  const limit = PLAN_LIMITS[plan];
  return { plan, count, limit, atLimit: count >= limit };
};

// --- Cart (per slug, persisted) --------------------------------------------

type CartState = {
  carts: Record<string, OrderItem[]>;
  add: (slug: string, item: OrderItem) => void;
  remove: (slug: string, productId: string) => void;
  setQty: (slug: string, productId: string, qty: number) => void;
  clear: (slug: string) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      carts: {},
      add: (slug, item) => {
        const cart = get().carts[slug] ?? [];
        const existing = cart.find((i) => i.productId === item.productId);
        const next = existing
          ? cart.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i,
            )
          : [...cart, item];
        set({ carts: { ...get().carts, [slug]: next } });
      },
      remove: (slug, productId) => {
        const cart = (get().carts[slug] ?? []).filter(
          (i) => i.productId !== productId,
        );
        set({ carts: { ...get().carts, [slug]: cart } });
      },
      setQty: (slug, productId, qty) => {
        const cart = (get().carts[slug] ?? []).map((i) =>
          i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i,
        );
        set({ carts: { ...get().carts, [slug]: cart } });
      },
      clear: (slug) => {
        const { [slug]: _, ...rest } = get().carts;
        set({ carts: rest });
      },
    }),
    { name: "ms-cart" },
  ),
);

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
