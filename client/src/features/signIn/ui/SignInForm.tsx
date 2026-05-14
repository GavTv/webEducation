"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import { loginThunk } from "@/entities/user/api/UserApiThunk";
import { setError } from "@/entities/user/slice/userSlice";
import { getRegisterEmailFormatError } from "@/shared/lib/registerFieldValidators";
import { clientRoutes } from "@/shared/consts/clientRoutes";
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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.user);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
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
      router.push(clientRoutes.classes);
    } catch {
      /* ошибка уже в store */
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

        <div className={styles.rowBetween}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
            />
            <span>Запомнить меня</span>
          </label>
          <button type="button" className={styles.linkBtn}>
            Забыли пароль?
          </button>
        </div>

        {error ? <p className={styles.formError}>{error}</p> : null}

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
