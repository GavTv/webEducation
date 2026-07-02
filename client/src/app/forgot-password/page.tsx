"use client";

import { useRouter } from "next/navigation";
import ForgotPasswordForm from "@/features/forgotPassword/ui/ForgotPasswordForm";
import styles from "@/features/auth/ui/EduChatAuthScreen.module.css";
import {
  authPath,
  clientRoutes,
} from "@/shared/consts/clientRoutes";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.brandRow}>
          <img
            src="/educhat-logo.png?v=2"
            alt="My Work Chat"
            className={styles.brandLogoImg}
            width={944}
            height={283}
            decoding="async"
          />
        </header>

        <ForgotPasswordForm
          onBackToSignIn={() => router.push(authPath("login"))}
          onCodeVerified={(resetToken) => {
            const q = new URLSearchParams({ token: resetToken });
            router.push(`${clientRoutes.resetPassword}?${q.toString()}`);
          }}
        />
      </div>
    </div>
  );
}
