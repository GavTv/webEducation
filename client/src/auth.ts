import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

/** Хвостовой слэш в AUTH_URL ломает redirect_uri (двойной // в URL → mismatch). */
function syncAuthEnv() {
  const raw = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (typeof raw === "string" && raw.trim()) {
    const url = raw.trim().replace(/\/+$/, "");
    process.env.AUTH_URL = url;
    process.env.NEXTAUTH_URL = url;
  }
}
syncAuthEnv();

/** Без секрета Auth.js отдаёт ClientFetchError на /api/auth/session */
function resolveAuthSecret(): string | undefined {
  const fromEnv = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (fromEnv?.trim()) {
    return fromEnv.trim();
  }
  if (process.env.NODE_ENV === "development") {
    return "educhat-local-dev-auth-secret";
  }
  return undefined;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/api/auth",
  trustHost: true,
  /** Не включайте в проде: в лог попадают токены. Только AUTH_DEBUG=1 для отладки. */
  debug: process.env.AUTH_DEBUG === "1",
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
    }),
  ],
  secret: resolveAuthSecret(),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      /**
       * id_token Google в JWT раздувает cookie (>4KB). Храним только access_token
       * и провайдер — обмен на сессию приложения на /auth/oauth-bridge.
       */
      if (
        (account?.provider === "google" || account?.provider === "github") &&
        typeof account.access_token === "string"
      ) {
        token.oauthAccessToken = account.access_token;
        token.oauthProvider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.oauthAccessToken === "string") {
        session.oauthAccessToken = token.oauthAccessToken;
      }
      if (token.oauthProvider === "google" || token.oauthProvider === "github") {
        session.oauthProvider = token.oauthProvider;
      }
      return session;
    },
  },
});
