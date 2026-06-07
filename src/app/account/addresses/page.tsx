import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AddressManager } from "@/components/account/address-manager";

export default async function AddressesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const dbReady = !!process.env.DATABASE_URL;

  const initial = userId && dbReady
    ? await db.select().from(addresses).where(eq(addresses.userId, userId))
    : [];

  return <AddressManager initial={initial} />;
}
