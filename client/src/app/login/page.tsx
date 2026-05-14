"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import EduChatAuthScreen from "../../features/auth/ui/EduChatAuthScreen";

/** Вход по прямой ссылке, например http://localhost:5173/login */
export default function LoginPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.user.user);

  useEffect(() => {
    if (user) router.replace(clientRoutes.classes);
  }, [user, router]);

  if (user) return null;

  return <EduChatAuthScreen initialAuthMode="signIn" />;
}
