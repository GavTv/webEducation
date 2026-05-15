import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

/** Хвостовой слэш в AUTH_URL ломает redirect_uri (двойной // в URL → mismatch). */
function trimAuthBaseUrls() {
  for (const key of ["AUTH_URL", "NEXTAUTH_URL"] as const) {
    const v = process.env[key];
    if (typeof v === "string" && v.endsWith("/")) {
      process.env[key] = v.replace(/\/+$/, "");
    }
  }
}
trimAuthBaseUrls();

export const { handlers, signIn, signOut, auth } = NextAuth({
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
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
