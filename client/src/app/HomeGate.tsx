"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import EduChatAuthScreen from "../features/auth/ui/EduChatAuthScreen";

/**
 * Корень «/»: форма входа/регистрации.
 * Если после refresh в Redux есть user — уходим на /classes (сессия ещё жива).
 */
export default function HomeGate() {
  const router = useRouter();
  const user = useAppSelector((s) => s.user.user);

  useEffect(() => {
    if (user) router.replace(clientRoutes.classes);
  }, [user, router]);

  if (user) return null;

  return <EduChatAuthScreen hideBack />;
}
