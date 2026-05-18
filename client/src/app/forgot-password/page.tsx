"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import ForgotPasswordForm from "@/features/forgotPassword/ui/ForgotPasswordForm";
import styles from "@/features/auth/ui/EduChatAuthScreen.module.css";
import { clientRoutes } from "@/shared/consts/clientRoutes";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <Link
        href={clientRoutes.home}
        className={styles.back}
        aria-label="На главную"
      >
        <ChevronLeft size={26} strokeWidth={2} />
      </Link>

      <div className={styles.inner}>
        <header className={styles.brandRow}>
          <img
            src="/educhat-logo.png?v=2"
            alt="EduChat"
            className={styles.brandLogoImg}
            width={944}
            height={283}
            decoding="async"
          />
        </header>

        <ForgotPasswordForm onBackToSignIn={() => router.push(clientRoutes.home)} />
      </div>
    </div>
  );
}
