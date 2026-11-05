"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { authPath, clientRoutes } from "@/shared/consts/clientRoutes";
import { AppLoading } from "@/shared/ui/AppLoading/AppLoading";

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
  }, [isInitialized, user, router]);

  return <AppLoading label={isInitialized ? "Перенаправляем…" : "Подключаем аккаунт…"} />;
}
