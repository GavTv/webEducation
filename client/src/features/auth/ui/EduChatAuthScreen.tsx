"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAppDispatch } from "@/shared/hooks/useReduxHooks";
import { setError } from "@/entities/user/slice/userSlice";
import {
  authPath,
  type AuthModeParam,
} from "@/shared/consts/clientRoutes";
import SignInForm from "../../signIn/ui/SignInForm";
import SignUpForm from "../../signUp/ui/SignUpForm";
import styles from "./EduChatAuthScreen.module.css";

type AuthMode = "signIn" | "signUp";

function modeFromParam(param: string | null): AuthMode {
  return param === "register" ? "signUp" : "signIn";
}

type EduChatAuthScreenProps = {
  hideBack?: boolean;
};

export default function EduChatAuthScreen({
  hideBack = false,
}: EduChatAuthScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const modeParam = searchParams.get("mode");
  const authMode = useMemo(() => modeFromParam(modeParam), [modeParam]);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (modeParam !== "login" && modeParam !== "register") {
      router.replace(authPath("login"), { scroll: false });
    }
  }, [modeParam, router]);

  useEffect(() => {
    dispatch(setError(null));
  }, [authMode, dispatch]);

  const switchMode = (mode: AuthMode) => {
    const next: AuthModeParam = mode === "signUp" ? "register" : "login";
    router.replace(authPath(next), { scroll: false });
  };

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
            src="/educhat-logo.png?v=2"
            alt="My Work Chat"
            className={styles.brandLogoImg}
            width={944}
            height={283}
            sizes="380px"
            decoding="async"
          />
        </header>

        {authMode === "signIn" ? (
          <SignInForm
            onRequestSignUp={() => switchMode("signUp")}
            rememberMe={rememberMe}
            onRememberMeChange={setRememberMe}
          />
        ) : (
          <SignUpForm
            onRequestSignIn={() => switchMode("signIn")}
            rememberMe={rememberMe}
            onRememberMeChange={setRememberMe}
          />
        )}
      </div>
    </div>
  );
}
