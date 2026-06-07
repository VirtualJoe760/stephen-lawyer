import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

const dbReady = !!process.env.DATABASE_URL;

export interface OrderListItem {
  id: string;
  status: string;
  totalCents: number;
  createdAt: string;
  itemCount: number;
}

export async function getOrdersForUser(userId: string): Promise<OrderListItem[]> {
  if (!dbReady) return MOCK_ORDERS;
  const rows = await db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: [desc(orders.createdAt)],
    with: { items: { columns: { id: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    totalCents: r.totalCents,
    createdAt: r.createdAt.toISOString(),
    itemCount: r.items.length,
  }));
}

export interface OrderDetail {
  id: string;
  status: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
  shippingAddress: Record<string, string>;
  trackingUrl?: string;
  trackingNumber?: string;
  items: { name: string; variant: string; quantity: number; unitPriceCents: number }[];
}

export async function getOrderDetail(id: string, userId?: string): Promise<OrderDetail | null> {
  if (!dbReady) return MOCK_ORDERS_DETAIL[id] ?? null;
  const row = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });
  if (!row) return null;
  if (userId && row.userId && row.userId !== userId) return null;
  return {
    id: row.id,
    status: row.status,
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    taxCents: row.taxCents,
    totalCents: row.totalCents,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    shippingAddress: row.shippingAddress as Record<string, string>,
    trackingUrl: row.trackingUrl ?? undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    items: row.items.map((i) => ({
      name: i.nameSnapshot,
      variant: i.variantSnapshot,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    })),
  };
}

// ---------- Mock fallbacks for development without a DB ----------

const MOCK_ORDERS: OrderListItem[] = [
  {
    id: "ord_demo_1",
    status: "shipped",
    totalCents: 13200,
    createdAt: "2026-05-22T18:14:00Z",
    itemCount: 2,
  },
  {
    id: "ord_demo_2",
    status: "in_production",
    totalCents: 8800,
    createdAt: "2026-06-01T11:02:00Z",
    itemCount: 1,
  },
];

const MOCK_ORDERS_DETAIL: Record<string, OrderDetail> = {
  ord_demo_1: {
    id: "ord_demo_1",
    status: "shipped",
    subtotalCents: 12600,
    shippingCents: 600,
    taxCents: 0,
    totalCents: 13200,
    currency: "USD",
    createdAt: "2026-05-22T18:14:00Z",
    shippingAddress: {
      name: "Joe Test",
      line1: "123 Demo St",
      city: "Encinitas",
      region: "CA",
      postalCode: "92024",
      country: "US",
    },
    trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9405511899223456789012",
    trackingNumber: "9405511899223456789012",
    items: [
      { name: "HAZARD CAMO HOODIE", variant: "Hazard · L", quantity: 1, unitPriceCents: 8800 },
      { name: "STENCIL TRUCKER HAT", variant: "Ink · One Size", quantity: 1, unitPriceCents: 3800 },
    ],
  },
  ord_demo_2: {
    id: "ord_demo_2",
    status: "in_production",
    subtotalCents: 8800,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 8800,
    currency: "USD",
    createdAt: "2026-06-01T11:02:00Z",
    shippingAddress: {
      name: "Joe Test",
      line1: "123 Demo St",
      city: "Encinitas",
      region: "CA",
      postalCode: "92024",
      country: "US",
    },
    items: [{ name: "HAZARD CAMO HOODIE", variant: "Acid · M", quantity: 1, unitPriceCents: 8800 }],
  },
};
