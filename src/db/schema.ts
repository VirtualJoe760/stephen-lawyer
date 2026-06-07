import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  pgEnum,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "submitted_to_printful",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const productCategory = pgEnum("product_category", [
  "tees",
  "hoodies",
  "hats",
  "accessories",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => ({
    pk: primaryKey({ columns: [a.provider, a.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (v) => ({ pk: primaryKey({ columns: [v.identifier, v.token] }) }),
);

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label"),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  region: text("region").notNull(),
  postalCode: text("postal_code").notNull(),
  country: varchar("country", { length: 2 }).notNull(),
  phone: text("phone"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const drops = pgTable("drops", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  releaseAt: timestamp("release_at"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    printfulSyncProductId: text("printful_sync_product_id").unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    descriptionMd: text("description_md"),
    category: productCategory("category").notNull(),
    isPublished: boolean("is_published").notNull().default(false),
    dropId: uuid("drop_id").references(() => drops.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (p) => ({ publishedIdx: index("products_published_idx").on(p.isPublished) }),
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    printfulSyncVariantId: text("printful_sync_variant_id").unique(),
    sku: text("sku").notNull(),
    color: text("color"),
    size: text("size"),
    retailPriceCents: integer("retail_price_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    inStock: boolean("in_stock").notNull().default(true),
    imageUrl: text("image_url"),
  },
  (v) => ({ skuIdx: uniqueIndex("variants_sku_idx").on(v.sku) }),
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    stripeSessionId: text("stripe_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    printfulOrderId: text("printful_order_id"),
    status: orderStatus("status").notNull().default("pending_payment"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    shippingAddress: jsonb("shipping_address_json").notNull(),
    trackingUrl: text("tracking_url"),
    trackingNumber: text("tracking_number"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (o) => ({
    userIdx: index("orders_user_idx").on(o.userId),
    statusIdx: index("orders_status_idx").on(o.status),
  }),
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => variants.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  nameSnapshot: text("name_snapshot").notNull(),
  variantSnapshot: text("variant_snapshot").notNull(),
});

export const newsletter = pgTable("newsletter", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("home"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productsRelations = relations(products, ({ many, one }) => ({
  variants: many(variants),
  drop: one(drops, { fields: [products.dropId], references: [drops.id] }),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(variants, { fields: [orderItems.variantId], references: [variants.id] }),
}));

// Type exports for use throughout the app.
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Address = typeof addresses.$inferSelect;

export const _sql = sql;

// ---------- Admin design generator ----------

export const catalogues = pgTable("catalogues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const designs = pgTable(
  "designs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogueId: uuid("catalogue_id")
      .notNull()
      .references(() => catalogues.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    cloudinaryPublicId: text("cloudinary_public_id").notNull(),
    url: text("url").notNull(),
    thumbUrl: text("thumb_url").notNull(),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (d) => ({ catalogueIdx: index("designs_catalogue_idx").on(d.catalogueId) }),
);

export const compositionStatus = pgEnum("composition_status", [
  "generating",
  "draft",
  "approved",
  "published",
  "failed",
]);

export const compositions = pgTable(
  "compositions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogueId: uuid("catalogue_id")
      .notNull()
      .references(() => catalogues.id, { onDelete: "cascade" }),
    designId: uuid("design_id")
      .notNull()
      .references(() => designs.id, { onDelete: "cascade" }),
    templateKey: text("template_key").notNull(),
    placement: text("placement").notNull().default("front"),
    // Design rectangle within the print area, in print-file pixels. Null = Printful default fit.
    position: jsonb("position").$type<{
      areaWidth: number;
      areaHeight: number;
      width: number;
      height: number;
      top: number;
      left: number;
    }>(),
    // Multiple designs on one product: one entry per print placement (front/back/
    // sleeve/...). When set, this is authoritative over the single designId/placement.
    placements: jsonb("placements").$type<
      Array<{
        placement: string;
        designId: string;
        position: { areaWidth: number; areaHeight: number; width: number; height: number; top: number; left: number } | null;
      }>
    >(),
    previewUrl: text("preview_url"),
    status: compositionStatus("status").notNull().default("generating"),
    printfulSyncProductId: text("printful_sync_product_id"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (c) => ({ catalogueIdx: index("compositions_catalogue_idx").on(c.catalogueId) }),
);

export const canvasNodes = pgTable(
  "canvas_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogueId: uuid("catalogue_id")
      .notNull()
      .references(() => catalogues.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "template" | "design" | "composition" | "label" | "group"
    refId: text("ref_id").notNull(), // designId / compositionId / templateKey / text / group name
    groupId: text("group_id"), // members of a group share the group node's id
    x: integer("x").notNull().default(0),
    y: integer("y").notNull().default(0),
    width: integer("width"), // persisted size (resize + group box)
    height: integer("height"),
    scale: integer("scale").notNull().default(100), // percent
    zIndex: integer("z_index").notNull().default(0),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (n) => ({ catalogueIdx: index("canvas_nodes_catalogue_idx").on(n.catalogueId) }),
);

export const cataloguesRelations = relations(catalogues, ({ many }) => ({
  designs: many(designs),
  compositions: many(compositions),
  canvasNodes: many(canvasNodes),
}));

export const designsRelations = relations(designs, ({ one, many }) => ({
  catalogue: one(catalogues, { fields: [designs.catalogueId], references: [catalogues.id] }),
  creator: one(users, { fields: [designs.createdBy], references: [users.id] }),
  compositions: many(compositions),
}));

export const compositionsRelations = relations(compositions, ({ one }) => ({
  catalogue: one(catalogues, { fields: [compositions.catalogueId], references: [catalogues.id] }),
  design: one(designs, { fields: [compositions.designId], references: [designs.id] }),
}));

export const canvasNodesRelations = relations(canvasNodes, ({ one }) => ({
  catalogue: one(catalogues, { fields: [canvasNodes.catalogueId], references: [catalogues.id] }),
}));

export type Catalogue = typeof catalogues.$inferSelect;
export type Design = typeof designs.$inferSelect;
export type Composition = typeof compositions.$inferSelect;
export type CanvasNode = typeof canvasNodes.$inferSelect;
