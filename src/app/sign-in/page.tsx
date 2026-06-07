import type { Metadata } from "next";
import { signIn } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your STEPHEN LAWYER account.",
};

async function signInGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/account" });
}

async function signInEmail(formData: FormData) {
  "use server";
  await signIn("resend", { email: formData.get("email") as string, redirectTo: "/account" });
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ verify?: string; from?: string }> }) {
  const sp = await searchParams;
  const verifyMode = sp.verify === "1";

  return (
    <div className="px-4 md:px-8 py-24">
      <div className="max-w-md mx-auto">
        <h1 className="wordmark text-5xl md:text-7xl mb-2">Sign in</h1>
        <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-10">
          No password. We'll email you a link.
        </p>

        {verifyMode ? (
          <div className="border-2 border-ink p-6">
            <p className="wordmark text-2xl mb-2">Check your email</p>
            <p className="text-sm">Click the link we sent to sign in. It expires in 24 hours.</p>
          </div>
        ) : (
          <>
            <form action={signInGoogle}>
              <button
                type="submit"
                className="w-full h-12 border-2 border-ink font-mono text-sm uppercase tracking-widest hover:bg-ink hover:text-bone transition-colors"
              >
                Continue with Google
              </button>
            </form>

            <div className="flex items-center gap-3 my-6 font-mono text-xs uppercase tracking-widest text-ink/40">
              <span className="flex-1 h-px bg-ink/20" />
              or
              <span className="flex-1 h-px bg-ink/20" />
            </div>

            <form action={signInEmail} className="space-y-3">
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-widest mb-2 block">Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@email.com"
                  className="h-12 w-full bg-transparent border-2 border-ink px-4 font-mono text-sm placeholder:text-ink/40 focus:outline-none focus:border-hazard"
                />
              </label>
              <button
                type="submit"
                className="w-full h-12 bg-ink text-bone font-mono text-sm uppercase tracking-widest hover:bg-hazard hover:text-ink transition-colors"
              >
                Continue with email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
