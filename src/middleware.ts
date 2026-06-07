// Auth-gating happens in `src/app/account/layout.tsx` via server-component
// `auth()` + `redirect()`. Middleware kept as a marker for future edge logic
// (rate limiting, A/B routing) — currently a no-op.
import { NextResponse, type NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
