"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import EduChatAuthScreen from "@/features/auth/ui/EduChatAuthScreen";
import { AppLoading } from "@/shared/ui/AppLoading/AppLoading";

/**
 * `/auth`: вход / регистрация. После успешной авторизации — редирект в раздел классов.
 */
export default function AuthGate() {
  const router = useRouter();
  const user = useAppSelector((s) => s.user.user);
  const isInitialized = useAppSelector((s) => s.user.isInitialized);

  useEffect(() => {
    if (isInitialized && user) {
      router.replace(clientRoutes.classes);
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || user) {
    return <AppLoading label={isInitialized ? "Перенаправляем…" : "Подключаем аккаунт…"} />;
  }

  return <EduChatAuthScreen hideBack />;
}
