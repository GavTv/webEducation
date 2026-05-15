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

  const googleMark = (
    <svg
      className={styles.googleIcon}
      width={22}
      height={22}
      viewBox="0 0 48 48"
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );

  const githubMark = (
    <svg
      className={styles.googleIcon}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
      />
    </svg>
  );

  return (
    <>
      <h1 className={styles.title}>Войти в аккаунт</h1>
      <p className={styles.subtitle}>
        Добро пожаловать обратно! Мы рады вас видеть 💜
      </p>

      <div className={styles.oauthRow}>
        <button
          type="button"
          className={styles.googleBtn}
          onClick={() => handleOAuthSignIn("google")}
          disabled={oauthBtnDisabled}
          aria-label="Войти через Google"
        >
          {oauthLoading === "google" ? (
            <Loader2 className={styles.spin} size={22} />
          ) : (
            <>
              {googleMark}
              <span>Войти через Google</span>
            </>
          )}
        </button>
        <button
          type="button"
          className={styles.githubBtn}
          onClick={() => handleOAuthSignIn("github")}
          disabled={oauthBtnDisabled}
          aria-label="Войти через GitHub"
        >
          {oauthLoading === "github" ? (
            <Loader2 className={styles.spin} size={22} />
          ) : (
            <>
              {githubMark}
              <span>Войти через GitHub</span>
            </>
          )}
        </button>
      </div>

      <div className={`${styles.divider} ${styles.dividerTight}`}>
        <span />
        <span className={styles.dividerText}>или через почту</span>
        <span />
      </div>

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

        <div className={styles.forgotUnderPassword}>
          <Link
            href={clientRoutes.forgotPassword}
            className={styles.linkBtn}
            scroll={false}
            prefetch
          >
            Забыли пароль?
          </Link>
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

        <div className={styles.rememberBelowLogin}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
            />
            <span>Запомнить меня</span>
          </label>
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
