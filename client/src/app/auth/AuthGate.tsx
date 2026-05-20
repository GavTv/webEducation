"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import EduChatAuthScreen from "@/features/auth/ui/EduChatAuthScreen";

/**
 * `/auth`: вход / регистрация. После успешной авторизации — редирект в раздел классов.
 */
export default function AuthGate() {
  const router = useRouter();
  const user = useAppSelector((s) => s.user.user);

  useEffect(() => {
    if (user) {
      router.replace(clientRoutes.classes);
    }
  }, [user, router]);

  if (user) {
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

  return <EduChatAuthScreen hideBack />;
}
