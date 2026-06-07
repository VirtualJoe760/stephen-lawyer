import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

const hasDb = !!process.env.DATABASE_URL;

const DEV_SECRET =
  process.env.NODE_ENV === "production"
    ? undefined
    : "stephen-lawyer-dev-only-secret-do-not-use-in-production-xyz";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? DEV_SECRET,
  adapter: hasDb
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  session: { strategy: hasDb ? "database" : "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? "",
      from: process.env.RESEND_FROM_EMAIL ?? "hello@stephenlawyer.clothing",
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      // Database sessions pass the `user` object; JWT sessions pass the token.
      if (session.user) {
        session.user.id = user?.id ?? (token?.sub as string | undefined) ?? session.user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in?verify=1",
  },
  trustHost: true,
});
