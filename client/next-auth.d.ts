import "next-auth";

declare module "next-auth" {
  interface Session {
    oauthAccessToken?: string;
    oauthProvider?: "google" | "github";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    oauthAccessToken?: string;
    oauthProvider?: "google" | "github";
  }
}
