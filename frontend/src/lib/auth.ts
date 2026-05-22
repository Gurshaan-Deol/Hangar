import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { BACKEND_URL } from "@/lib/config";

// next-auth/jwt is not a separate subpath in beta.18 — augment the Session
// interface here and use explicit casts for extra JWT fields in callbacks.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
    syncError?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required in Docker: trusts the Host header so NextAuth doesn't reject
  // requests that arrive at the container hostname instead of NEXTAUTH_URL.
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },

  // NextAuth v5 encrypts session JWTs (JWE) by default, but the Python backend
  // verifies plain HS256 JWTs with NEXTAUTH_SECRET. Override encode/decode so
  // the cookie value is a standard 3-part HS256 token the backend can read.
  jwt: {
    async encode({ secret, token }) {
      const { SignJWT } = await import("jose");
      const key = new TextEncoder().encode(
        Array.isArray(secret) ? secret[0] : secret,
      );
      return new SignJWT(token as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(key);
    },
    async decode({ secret, token }) {
      if (!token) return null;
      const { jwtVerify } = await import("jose");
      const key = new TextEncoder().encode(
        Array.isArray(secret) ? secret[0] : secret,
      );
      try {
        const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
        return payload;
      } catch {
        return null;
      }
    },
  },

  callbacks: {
    async signIn() {
      return true;
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        token["provider"] = account.provider;
        token["providerId"] = account.providerAccountId;

        try {
          const syncResponse = await fetch(`${BACKEND_URL}/api/v1/auth/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: account.provider,
              provider_id: account.providerAccountId,
              email: user.email,
              name: user.name ?? null,
              avatar_url: user.image ?? null,
            }),
          });

          if (!syncResponse.ok) {
            throw new Error(`Backend sync failed: ${syncResponse.status}`);
          }

          const dbUser = (await syncResponse.json()) as { id: string };
          token["userId"] = dbUser.id;
          token["provider"] = account.provider;
          token["providerId"] = account.providerAccountId;
        } catch (error) {
          console.error("[auth] Failed to sync user with backend:", error);
          token["syncError"] = true;
          // Still return token — NextAuth requires it, but mark it so we can show a helpful error
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token["userId"] as string) ?? "";
        session.user.email = (token.email as string) ?? "";
      }
      if (token["syncError"]) {
        session.syncError = true;
      }
      return session;
    },
  },
});
