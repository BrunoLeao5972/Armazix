import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type Plan, PLAN_LIMITS } from "./plans";

const PERSIST_DB_NAME = "armazix-persist";
const PERSIST_STORE_NAME = "zustand";
const TENANT_PERSIST_KEY = "ms-tenant";
const TENANT_PERSIST_SIGNAL_KEY = `${TENANT_PERSIST_KEY}__signal`;

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

function notifyPersistChange(key: string) {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(`${key}__signal`, String(Date.now()));
  } catch {
    // Ignore cross-tab notification failures.
  }
}

function readLocalStorageItem(key: string) {
  if (!canUseBrowserStorage()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorageItem(key: string, value: string) {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore fallback storage failures.
  }
}

function removeLocalStorageItem(key: string) {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore fallback storage failures.
  }
}

async function openPersistDb(): Promise<IDBDatabase | null> {
  if (!canUseBrowserStorage() || typeof window.indexedDB === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(PERSIST_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PERSIST_STORE_NAME)) {
        db.createObjectStore(PERSIST_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function readIndexedDbItem(key: string): Promise<string | null> {
  const db = await openPersistDb();
  if (!db) {
    return readLocalStorageItem(key);
  }

  return new Promise((resolve) => {
    const tx = db.transaction(PERSIST_STORE_NAME, "readonly");
    const store = tx.objectStore(PERSIST_STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
    request.onerror = () => resolve(readLocalStorageItem(key));
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
    tx.onabort = () => db.close();
  });
}

async function writeIndexedDbItem(key: string, value: string): Promise<void> {
  const db = await openPersistDb();
  if (!db) {
    writeLocalStorageItem(key, value);
    notifyPersistChange(key);
    return;
  }

  await new Promise<void>((resolve) => {
    const tx = db.transaction(PERSIST_STORE_NAME, "readwrite");
    tx.objectStore(PERSIST_STORE_NAME).put(value, key);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      writeLocalStorageItem(key, value);
      resolve();
    };
    tx.onabort = () => {
      db.close();
      writeLocalStorageItem(key, value);
      resolve();
    };
  });

  notifyPersistChange(key);
}

async function removeIndexedDbItem(key: string): Promise<void> {
  const db = await openPersistDb();
  if (!db) {
    removeLocalStorageItem(key);
    notifyPersistChange(key);
    return;
  }

  await new Promise<void>((resolve) => {
    const tx = db.transaction(PERSIST_STORE_NAME, "readwrite");
    tx.objectStore(PERSIST_STORE_NAME).delete(key);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      removeLocalStorageItem(key);
      resolve();
    };
    tx.onabort = () => {
      db.close();
      removeLocalStorageItem(key);
      resolve();
    };
  });

  notifyPersistChange(key);
}

const tenantPersistStorage = createJSONStorage(() => ({
  getItem: (key) => readIndexedDbItem(key),
  setItem: (key, value) => writeIndexedDbItem(key, value),
  removeItem: (key) => removeIndexedDbItem(key),
}));

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

/**
 * Multi-tenant data layer.
 * Auth (users/sessions) is handled by the DB via auth.server.ts.
 * Store/product/order data still persists in IndexedDB (browser) for now.
 */

export type BusinessHour = {
  day: string;
  open: string;
  close: string;
  closed: boolean;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
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

export type StoreBanner = {
  imageUrl: string;
  title: string;
  subtitle: string;
  autoAdvanceSeconds: number;
};

export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export type Store = {
  id: string;
  ownerId: string;
  name: string;
  logoUrl?: string;
  banners: StoreBanner[];
  banner?: StoreBanner;
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

export type ProductVariationValue = {
  id: string;
  label: string;
  priceAdjustment?: number;
  stock?: number;
  sku?: string;
};

export type ProductVariation = {
  id: string;
  name: string;
  values: ProductVariationValue[];
};

export type Product = {
  id: string;
  storeId: string;
  code: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  unit: string;
  minStock: number;
  category: string;
  image: string;
  imageUrl?: string;
  // extended optional fields
  cost?: number;
  trackStock?: boolean;
  active?: boolean;
  allowSellWithoutStock?: boolean;
  featured?: boolean;
  onPromotion?: boolean;
  promotionPrice?: number;
  images?: string[];
  variations?: ProductVariation[];
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

export type Customer = {
  id: string;
  storeId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  document?: string;
  active: boolean;
  createdAt: number;
};

export type PaymentMethod = {
  id: string;
  storeId: string;
  name: string;
  type: "cash" | "card" | "pix" | "installment";
  installments?: number;
  active: boolean;
  createdAt: number;
};

export type StoreUser = {
  id: string;
  storeId: string;
  name: string; // credential/login
  password: string;
  fullName: string;
  document?: string;
  email?: string;
  role?: "admin" | "caixa" | "gerente" | "vendedor" | "seller" | "viewer";
  active: boolean;
  createdAt: number;
};

const DEFAULT_BUSINESS_HOURS: BusinessHour[] = [
  {
    day: "Segunda-feira",
    open: "08:00",
    close: "18:00",
    closed: false,
    hasBreak: false,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    day: "Terca-feira",
    open: "08:00",
    close: "18:00",
    closed: false,
    hasBreak: false,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    day: "Quarta-feira",
    open: "08:00",
    close: "18:00",
    closed: false,
    hasBreak: false,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    day: "Quinta-feira",
    open: "08:00",
    close: "18:00",
    closed: false,
    hasBreak: false,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    day: "Sexta-feira",
    open: "08:00",
    close: "18:00",
    closed: false,
    hasBreak: false,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    day: "Sabado",
    open: "08:00",
    close: "13:00",
    closed: false,
    hasBreak: false,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    day: "Domingo",
    open: "08:00",
    close: "12:00",
    closed: true,
    hasBreak: false,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
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

const DEFAULT_STORE_BANNER: StoreBanner = {
  imageUrl:
    "https://images.unsplash.com/photo-1592861956120-e524fc739696?auto=format&fit=crop&q=80&w=1400",
  title: "Combos Inteligentes",
  subtitle: "Sugestoes prontas para seu carrinho render mais",
  autoAdvanceSeconds: 5,
};

function normalizeStoreBanners(
  banners: StoreBanner[] | undefined,
  legacyBanner: StoreBanner | undefined,
): StoreBanner[] {
  const source = Array.isArray(banners) && banners.length > 0
    ? banners
    : legacyBanner
      ? [legacyBanner]
      : [];

  return source.slice(0, 3).map((banner) => ({
    imageUrl: banner.imageUrl?.trim() || DEFAULT_STORE_BANNER.imageUrl,
    title: banner.title?.trim() || DEFAULT_STORE_BANNER.title,
    subtitle: banner.subtitle?.trim() || DEFAULT_STORE_BANNER.subtitle,
    autoAdvanceSeconds:
      Number.isFinite(Number(banner.autoAdvanceSeconds)) && Number(banner.autoAdvanceSeconds) >= 2
        ? Math.min(30, Math.max(2, Math.round(Number(banner.autoAdvanceSeconds))))
        : DEFAULT_STORE_BANNER.autoAdvanceSeconds,
  }));
}

export function normalizeStore(store: Store): Store {
  const rawBusinessHours = store.businessHours ?? [];
  const rawFees = store.delivery?.fees ?? [];

  return {
    ...store,
    taxId: store.taxId ?? store.cnpj ?? "",
    logoUrl: store.logoUrl ?? "",
    banners: normalizeStoreBanners(store.banners, store.banner),
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
            hasBreak: h.hasBreak ?? false,
            breakStart: h.breakStart ?? "12:00",
            breakEnd: h.breakEnd ?? "13:00",
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

const uid = () => crypto.randomUUID();

// --- Auth -------------------------------------------------------------------

type AuthState = {
  currentUserId: string | null;
  currentUserName: string | null;
  sessionToken: string | null;
  setSession: (userId: string, name: string, sessionToken: string) => void;
  setCurrentUserId: (userId: string | null) => void;
  logout: () => void;
  /** @deprecated Store linkage is now tracked via useTenant.ownerId — kept for compatibility */
  attachStore: (userId: string, storeId: string) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      currentUserId: null,
      currentUserName: null,
      sessionToken: null,
      setSession: (userId, name, sessionToken) =>
        set({ currentUserId: userId, currentUserName: name, sessionToken }),
      setCurrentUserId: (userId) => set({ currentUserId: userId }),
      logout: () => set({ currentUserId: null, currentUserName: null, sessionToken: null }),
      attachStore: () => {
        // No-op: store linkage is found via useTenant.stores[].ownerId === currentUserId
      },
    }),
    { name: "ms-auth" },
  ),
);

// --- Tenants (Stores) -------------------------------------------------------

type TenantState = {
  stores: Store[];
  products: Product[];
  orders: Order[];
  customers: Customer[];
  paymentMethods: PaymentMethod[];
  storeUsers: StoreUser[];
  upsertStoreFromServer: (data: {
    id: string;
    ownerUserId: string;
    name: string;
    slug: string;
    description: string;
    plan?: string | null;
    pdvAccess?: boolean | null;
    pdvEnabled?: boolean | null;
    settings?: unknown;
  }) => void;
  createStore: (
    ownerId: string,
    data: { name: string; slug: string; description: string },
  ) => { ok: true; storeId: string } | { ok: false; error: string };
  updateStore: (storeId: string, patch: Partial<Store>) => void;
  upgradePlan: (storeId: string, plan: Plan) => void;
  // products
  addProduct: (storeId: string, p: Omit<Product, "id" | "storeId">) => { ok: boolean; error?: string };
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  // orders
  createOrder: (
    storeId: string,
    data: Omit<Order, "id" | "storeId" | "status" | "createdAt">,
  ) => string;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  // customers
  addCustomer: (storeId: string, data: Omit<Customer, "id" | "storeId" | "createdAt">) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  // payment methods
  addPaymentMethod: (storeId: string, data: Omit<PaymentMethod, "id" | "storeId" | "createdAt">) => string;
  updatePaymentMethod: (id: string, patch: Partial<PaymentMethod>) => void;
  removePaymentMethod: (id: string) => void;
  // store users
  addStoreUser: (storeId: string, data: Omit<StoreUser, "id" | "storeId" | "createdAt">) => string;
  updateStoreUser: (id: string, patch: Partial<StoreUser>) => void;
  removeStoreUser: (id: string) => void;
};

export const useTenant = create<TenantState>()(
  persist(
    (set, get) => ({
      stores: [],
      products: [],
      orders: [],
      customers: [],
      paymentMethods: [],
      storeUsers: [],
      upsertStoreFromServer: (data) => {
        const cleanSlug = normalizeSlug(data.slug);
        if (!cleanSlug) return;
        const existingStore = get().stores.find((s) => s.id === data.id);

        const defaultStore: Store = {
          id: data.id,
          ownerId: data.ownerUserId,
          name: data.name,
          logoUrl: "",
          banners: [],
          slug: cleanSlug,
          taxId: "",
          cnpj: "",
          address: "",
          addressInfo: { ...DEFAULT_ADDRESS_INFO },
          description: data.description ?? "",
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
          plan: (data.plan as Plan) ?? "free",
          pdvAccess: Boolean(data.pdvAccess),
          pdvEnabled: Boolean(data.pdvEnabled),
          createdAt: Date.now(),
        };

        const settingsPatch =
          data.settings && typeof data.settings === "object"
            ? (data.settings as Partial<Store>)
            : {};

        const baseStore = existingStore ? normalizeStore(existingStore) : defaultStore;

        const merged = normalizeStore({
          ...baseStore,
          ...settingsPatch,
          id: data.id,
          ownerId: data.ownerUserId,
          name: data.name,
          slug: cleanSlug,
          description: data.description ?? baseStore.description,
          plan: (data.plan as Plan) ?? baseStore.plan,
          pdvAccess: data.pdvAccess ?? baseStore.pdvAccess,
          pdvEnabled: data.pdvEnabled ?? baseStore.pdvEnabled,
        });

        set({
          stores: get().stores.some((s) => s.id === data.id)
            ? get().stores.map((s) => (s.id === data.id ? merged : s))
            : [...get().stores, merged],
        });
      },
      createStore: (ownerId, { name, slug, description }) => {
        const cleanSlug = normalizeSlug(slug);
        if (!cleanSlug) return { ok: false, error: "Slug inválido" };
        if (get().stores.find((s) => s.slug === cleanSlug))
          return { ok: false, error: "Slug já em uso" };
        const store: Store = {
          id: uid(),
          ownerId,
          name,
          logoUrl: "",
          banners: [],
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
      addProduct: (storeId, p) => {
        const store = get().stores.find((s) => s.id === storeId);
        const plan: Plan = store?.plan ?? "free";
        const limit = PLAN_LIMITS[plan];
        const productsOfStore = get().products.filter((x) => x.storeId === storeId);
        const count = productsOfStore.length;
        if (count >= limit) {
          return { ok: false, error: `Limite de ${limit} produtos do plano ${plan} atingido.` };
        }

        const hasDuplicatedCode = productsOfStore.some(
          (product) => Number(product.code) === Number(p.code),
        );
        if (hasDuplicatedCode) {
          return { ok: false, error: `O codigo ${p.code} ja esta em uso.` };
        }

        set({ products: [...get().products, { ...p, id: uid(), storeId }] });
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
      // customers
      addCustomer: (storeId, data) => {
        const id = uid();
        set({
          customers: [
            ...get().customers,
            {
              ...data,
              active: data.active ?? true,
              storeId,
              id,
              createdAt: Date.now(),
            },
          ],
        });
        return id;
      },
      updateCustomer: (id, patch) =>
        set({
          customers: get().customers.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }),
      removeCustomer: (id) =>
        set({ customers: get().customers.filter((c) => c.id !== id) }),
      // payment methods
      addPaymentMethod: (storeId, data) => {
        const id = uid();
        set({ paymentMethods: [...get().paymentMethods, { ...data, storeId, id, createdAt: Date.now() }] });
        return id;
      },
      updatePaymentMethod: (id, patch) =>
        set({
          paymentMethods: get().paymentMethods.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        }),
      removePaymentMethod: (id) =>
        set({ paymentMethods: get().paymentMethods.filter((p) => p.id !== id) }),
      // store users
      addStoreUser: (storeId, data) => {
        const id = uid();
        set({
          storeUsers: [
            ...get().storeUsers,
            {
              ...data,
              fullName: data.fullName ?? data.name,
              password: data.password ?? "",
              active: data.active ?? true,
              storeId,
              id,
              createdAt: Date.now(),
            },
          ],
        });
        return id;
      },
      updateStoreUser: (id, patch) =>
        set({
          storeUsers: get().storeUsers.map((u) =>
            u.id === id ? { ...u, ...patch } : u,
          ),
        }),
      removeStoreUser: (id) =>
        set({ storeUsers: get().storeUsers.filter((u) => u.id !== id) }),
    }),
    {
      name: TENANT_PERSIST_KEY,
      storage: tenantPersistStorage,
    },
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

function syncPersistedStoresAcrossTabs() {
  if (typeof window === "undefined") return;
  if ((window as Window & { __armazixPersistSyncReady?: boolean }).__armazixPersistSyncReady) return;

  (window as Window & { __armazixPersistSyncReady?: boolean }).__armazixPersistSyncReady = true;

  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage || !event.key) return;

    if (event.key === "ms-auth") {
      void useAuth.persist.rehydrate();
      return;
    }

    if (event.key === TENANT_PERSIST_SIGNAL_KEY) {
      void useTenant.persist.rehydrate();
      return;
    }

    if (event.key === "ms-cart") {
      void useCart.persist.rehydrate();
    }
  });
}

syncPersistedStoresAcrossTabs();

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
