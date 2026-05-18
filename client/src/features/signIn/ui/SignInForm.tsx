"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import { loginThunk } from "@/entities/user/api/UserApiThunk";
import { setError } from "@/entities/user/slice/userSlice";
import { getRegisterEmailFormatError } from "@/shared/lib/registerFieldValidators";
import { AuthField } from "../../auth/shared/AuthField";
import styles from "../../auth/shared/eduChatForm.module.css";

export type SignInFormProps = {
  onRequestSignUp: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
};

export default function SignInForm({
  onRequestSignUp,
  rememberMe,
  onRememberMeChange,
}: SignInFormProps) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.user);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | "google" | "github">(
    null,
  );
  const [signInFieldErrors, setSignInFieldErrors] = useState<{
    email?: string | null;
    password?: string | null;
  }>({});

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("educhat_email")
        : null;
    if (saved) setSignInEmail(saved);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setError(null));
    const le = getRegisterEmailFormatError(signInEmail);
    const lp =
      !signInPassword || signInPassword.trim().length === 0
        ? "Введите пароль"
        : null;
    setSignInFieldErrors({ email: le, password: lp });
    if (le || lp) return;

    try {
      await dispatch(
        loginThunk({
          email: signInEmail.trim(),
          password: signInPassword,
          rememberMe,
        }),
      ).unwrap();
      if (rememberMe) localStorage.setItem("educhat_email", signInEmail.trim());
      else localStorage.removeItem("educhat_email");
    } catch {
      /* ошибка уже в store */
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    dispatch(setError(null));
    setOauthLoading(provider);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const callbackUrl = `${origin}${clientRoutes.oauthBridge}?remember=${rememberMe ? "1" : "0"}`;
      await signIn(provider, { callbackUrl });
    } catch {
      dispatch(
        setError(
          provider === "google"
            ? "Не удалось начать вход через Google"
            : "Не удалось начать вход через GitHub",
        ),
      );
    } finally {
      setOauthLoading(null);
    }
  };

  const purpleIcon = (node: ReactNode) => (
    <span className={styles.iconTint}>{node}</span>
  );

  const signInSubmitDisabled = useMemo(() => {
    if (isLoading) return true;
    if (!signInEmail.trim() || !signInPassword.trim()) return true;
    if (getRegisterEmailFormatError(signInEmail)) return true;
    return false;
  }, [isLoading, signInEmail, signInPassword]);

  const oauthBusy = oauthLoading !== null;
  const oauthBtnDisabled = isLoading || oauthBusy;

  const googleIcon = (
    <svg
      className={styles.oauthIcon}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );

  const githubIcon = (
    <svg
      className={styles.oauthIcon}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.18-3.37-1.18-.45-1.16-1.1-1.47-1.1-1.47-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.36 1.11 2.94.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.2 9.2 0 0112 6.84c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.58.69.48A10.03 10.03 0 0022 12.26C22 6.58 17.52 2 12 2z"
      />
    </svg>
  );

  return (
    <>
      <h1 className={styles.title}>Войти в аккаунт</h1>
      <p className={styles.subtitle}>
        Добро пожаловать обратно! Мы рады вас видеть 💜
      </p>

      <form className={styles.form} onSubmit={handleSignIn}>
        <AuthField
          label="Email"
          icon={purpleIcon(<Mail size={20} strokeWidth={2} />)}
          type="email"
          value={signInEmail}
          onChange={(v) => {
            setSignInEmail(v);
            dispatch(setError(null));
            setSignInFieldErrors((p) => ({ ...p, email: null }));
          }}
          onBlurField={() => {
            const err = getRegisterEmailFormatError(signInEmail);
            setSignInFieldErrors((p) => ({ ...p, email: err }));
          }}
          autoComplete="email"
          errorMessage={signInFieldErrors.email}
        />
        <AuthField
          label="Пароль"
          icon={purpleIcon(<Lock size={20} strokeWidth={2} />)}
          type={showSignInPassword ? "text" : "password"}
          value={signInPassword}
          onChange={(v) => {
            setSignInPassword(v);
            dispatch(setError(null));
            setSignInFieldErrors((p) => ({ ...p, password: null }));
          }}
          onBlurField={() => {
            const err =
              !signInPassword || signInPassword.length === 0
                ? "Введите пароль"
                : null;
            setSignInFieldErrors((p) => ({ ...p, password: err }));
          }}
          autoComplete="current-password"
          errorMessage={signInFieldErrors.password}
          end={
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setShowSignInPassword((v) => !v)}
              aria-label={
                showSignInPassword ? "Скрыть пароль" : "Показать пароль"
              }
            >
              {showSignInPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />

        <div className={styles.forgotRememberRow}>
          <Link
            href={clientRoutes.forgotPassword}
            className={styles.linkBtn}
            scroll={false}
            prefetch
          >
            Забыли пароль?
          </Link>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
            />
            <span>Запомнить меня</span>
          </label>
        </div>

        {error ? (
          <div className={styles.messagesBelowForgot} role="alert">
            <p className={styles.formError}>{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={signInSubmitDisabled}
        >
          {isLoading ? (
            <Loader2 className={styles.spin} size={22} />
          ) : (
            "Войти"
          )}
        </button>

        <div className={`${styles.oauthRow} ${styles.oauthRowBelowLogin}`}>
          <button
            type="button"
            className={styles.googleBtn}
            onClick={() => handleOAuthSignIn("google")}
            disabled={oauthBtnDisabled}
            aria-label="Значок Google"
          >
            {oauthLoading === "google" ? (
              <Loader2 className={styles.spin} size={22} />
            ) : (
              <>
                {googleIcon}
                <span>Google</span>
              </>
            )}
          </button>
          <button
            type="button"
            className={styles.githubBtn}
            onClick={() => handleOAuthSignIn("github")}
            disabled={oauthBtnDisabled}
            aria-label="Значок GitHub"
          >
            {oauthLoading === "github" ? (
              <Loader2 className={styles.spin} size={22} />
            ) : (
              <>
                {githubIcon}
                <span>GitHub</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className={styles.divider}>
        <span />
        <span className={styles.dividerText}>
          Нет аккаунта?{" "}
          <button
            type="button"
            className={styles.inlineLink}
            onClick={onRequestSignUp}
          >
            Зарегистрироваться
          </button>
        </span>
        <span />
      </div>
    </>
  );
}
