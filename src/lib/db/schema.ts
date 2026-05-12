import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const emailAuthCodes = pgTable(
  "email_auth_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    purpose: text("purpose").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeHashIdx: index("email_auth_codes_code_hash_idx").on(table.codeHash),
    userPurposeIdx: index("email_auth_codes_user_purpose_idx").on(
      table.userId,
      table.purpose,
    ),
    emailPurposeIdx: index("email_auth_codes_email_purpose_idx").on(
      table.email,
      table.purpose,
    ),
  }),
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("auth_sessions_token_hash_unique").on(
      table.tokenHash,
    ),
    userIdIdx: index("auth_sessions_user_id_idx").on(table.userId),
  }),
);

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").default("").notNull(),
    settings: jsonb("settings").default({}).notNull(),
    plan: text("plan").default("free").notNull(),
    pdvAccess: boolean("pdv_access").default(false).notNull(),
    pdvEnabled: boolean("pdv_enabled").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("stores_slug_unique").on(table.slug),
    nameUnique: uniqueIndex("stores_name_unique").on(table.name),
    ownerIdx: index("stores_owner_user_id_idx").on(table.ownerUserId),
  }),
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    status: text("status").default("pending").notNull(),
    totalCents: integer("total_cents").notNull(),
    paymentMethod: text("payment_method").notNull(),
    customer: jsonb("customer").notNull(),
    items: jsonb("items").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    storeIdx: index("orders_store_id_idx").on(table.storeId),
  }),
);

export const paymentAudits = pgTable(
  "payment_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    eventType: text("event_type").notNull(),
    paymentId: text("payment_id").notNull(),
    externalReference: text("external_reference"),
    status: text("status").notNull(),
    amountCents: integer("amount_cents"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    paymentIdx: index("payment_audits_payment_id_idx").on(table.paymentId),
  }),
);

export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    paymentId: text("payment_id"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerEventUnique: uniqueIndex(
      "payment_webhook_events_provider_event_unique",
    ).on(table.provider, table.providerEventId),
  }),
);
