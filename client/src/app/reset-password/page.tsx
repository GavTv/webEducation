"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ResetPasswordForm from "@/features/forgotPassword/ui/ResetPasswordForm";
import styles from "@/features/auth/ui/EduChatAuthScreen.module.css";
import {
  authPath,
  clientRoutes,
} from "@/shared/consts/clientRoutes";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  useEffect(() => {
    if (!token) {
      router.replace(clientRoutes.forgotPassword);
    }
  }, [token, router]);

  if (!token) {
    return null;
  }

  return (
    <ResetPasswordForm
      resetToken={token}
      onSuccess={() => router.replace(authPath("login"))}
    />
  );
}

export default function ResetPasswordPage() {
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

        <Suspense fallback={null}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
