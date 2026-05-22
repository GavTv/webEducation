"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { authPath, clientRoutes } from "@/shared/consts/clientRoutes";

/**
 * Корень «/»: редирект в приложение или на страницу входа.
 */
export default function HomeGate() {
  const router = useRouter();
  const user = useAppSelector((s) => s.user.user);
  const isInitialized = useAppSelector((s) => s.user.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;
    router.replace(user ? clientRoutes.classes : authPath("login"));
  }, [user, isInitialized, router]);

  if (!isInitialized) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--app-page-bg)",
          color: "#9ca3af",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Загрузка…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--app-page-bg)",
        color: "#9ca3af",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Перенаправление…
    </div>
  );
}
