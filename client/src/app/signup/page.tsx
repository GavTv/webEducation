"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import EduChatAuthScreen from "../../features/auth/ui/EduChatAuthScreen";

/** Регистрация по прямой ссылке: http://localhost:5173/signup */
export default function SignupPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.user.user);

  useEffect(() => {
    if (user) router.replace(clientRoutes.classes);
  }, [user, router]);

  if (user) return null;

  return <EduChatAuthScreen initialAuthMode="signUp" />;
}
