import { Suspense } from "react";
import AuthSessionProvider from "@/application/AuthSessionProvider";
import AuthGate from "./AuthGate";

/**
 * `/auth?mode=login` | `/auth?mode=register` — вход и регистрация.
 */
export default function AuthPage() {
  return (
    <AuthSessionProvider>
      <Suspense
        fallback={
          <div
            style={{
              minHeight: "100dvh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--app-page-bg)",
              color: "#9ca3af",
            }}
          >
            Загрузка…
          </div>
        }
      >
        <AuthGate />
      </Suspense>
    </AuthSessionProvider>
  );
}
