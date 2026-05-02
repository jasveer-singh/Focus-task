import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isDev = process.env.NODE_ENV === "development";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: requiredEnv("AUTH_SECRET"),
  trustHost: true,
  debug: isDev,
  logger: {
    error(code, ...message) {
      console.error("[auth][error]", code, ...message);
    },
    warn(code, ...message) {
      console.warn("[auth][warn]", code, ...message);
    }
  },
  adapter: PrismaAdapter(prisma),
  // Use JWT in dev so credentials provider works without extra DB session rows
  session: { strategy: isDev ? "jwt" : "database" },
  pages: { signIn: "/signin" },
  callbacks: {
    // Expose user id on session in JWT mode
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    }
  },
  providers: [
    // ── Dev-only: bypass Google OAuth with any email ────────────────────────
    ...(isDev
      ? [
          Credentials({
            id: "dev-credentials",
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email" }
            },
            async authorize(credentials) {
              const email = credentials?.email as string | undefined;
              if (!email) return null;
              // Find or create the user in DB so push subscriptions etc. work
              const user = await prisma.user.upsert({
                where: { email },
                update: {},
                create: { email, name: email.split("@")[0] }
              });
              return { id: user.id, email: user.email, name: user.name };
            }
          })
        ]
      : []),
    // ───────────────────────────────────────────────────────────────────────
    Google({
      clientId: requiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ]
});
