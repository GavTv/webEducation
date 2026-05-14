"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAppDispatch } from "@/shared/hooks/useReduxHooks";
import { setError } from "@/entities/user/slice/userSlice";
import SignInForm from "../../signIn/ui/SignInForm";
import SignUpForm from "../../signUp/ui/SignUpForm";
import styles from "./EduChatAuthScreen.module.css";

type AuthMode = "signIn" | "signUp";

type EduChatAuthScreenProps = {
  hideBack?: boolean;
  /** С какого режима открыть экран (например `/signup` → signUp). */
  initialAuthMode?: AuthMode;
};

export default function EduChatAuthScreen({
  hideBack = false,
  initialAuthMode = "signIn",
}: EduChatAuthScreenProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [authMode, setAuthMode] = useState<AuthMode>(initialAuthMode);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    dispatch(setError(null));
  }, [authMode, dispatch]);

  return (
    <div className={styles.page}>
      {!hideBack ? (
        <button
          type="button"
          className={styles.back}
          onClick={() => router.back()}
          aria-label="Назад"
        >
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
      ) : null}

      <div className={styles.inner}>
        <header className={styles.brandRow}>
          <img
            src="/educhat-logo.png"
            alt="EduChat"
            className={styles.brandLogoImg}
            width={660}
            height={144}
            decoding="async"
          />
        </header>

        {authMode === "signIn" ? (
          <SignInForm
            onRequestSignUp={() => setAuthMode("signUp")}
            rememberMe={rememberMe}
            onRememberMeChange={setRememberMe}
          />
        ) : (
          <SignUpForm
            onRequestSignIn={() => setAuthMode("signIn")}
            rememberMe={rememberMe}
            onRememberMeChange={setRememberMe}
          />
        )}
      </div>
    </div>
  );
}
