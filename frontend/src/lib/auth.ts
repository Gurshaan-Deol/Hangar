import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

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
  }
}

const BACKEND_URL = process.env.BACKEND_URL ?? "http://backend:8000";

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
  callbacks: {
    async signIn() {
      return true;
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        token["provider"] = account.provider;
        token["providerId"] = account.providerAccountId;

        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/auth/sync`, {
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

          if (res.ok) {
            const dbUser = (await res.json()) as { id: string };
            token["userId"] = dbUser.id;
          } else {
            console.error("[auth] Backend /auth/sync returned", res.status);
          }
        } catch (err) {
          // Don't block login if the backend is temporarily unreachable
          console.error("[auth] Failed to sync user with backend:", err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token["userId"] as string) ?? "";
        session.user.email = (token.email as string) ?? "";
      }
      return session;
    },
  },
});
