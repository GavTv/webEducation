"use client";

import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import EduChatAuthScreen from "@/features/auth/ui/EduChatAuthScreen";
import PostAuthStub from "@/features/auth/ui/PostAuthStub";

/**
 * Корень «/»: форма входа/регистрации или заглушка после успешной авторизации.
 */
export default function HomeGate() {
  const user = useAppSelector((s) => s.user.user);

  if (user) {
    return <PostAuthStub />;
  }

  return <EduChatAuthScreen hideBack />;
}
