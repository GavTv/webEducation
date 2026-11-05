"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { AtSign, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import { registerThunk } from "@/entities/user/api/UserApiThunk";
import { setError } from "@/entities/user/slice/userSlice";
import {
  getRegisterConfirmError,
  getRegisterEmailFormatError,
  getRegisterNameError,
  getRegisterPasswordError,
  getRegisterUsernameFormatError,
  PASSWORD_RULES_MSG,
} from "@/shared/lib/registerFieldValidators";
import { useAutoDismiss } from "@/shared/hooks/useAutoDismiss";
import { FadeAlert } from "@/shared/ui/FadeAlert/FadeAlert";
import { AuthField } from "../../auth/shared/AuthField";
import styles from "../../auth/shared/eduChatForm.module.css";
import signUpStyles from "./SignUpForm.module.css";

type SignUpFieldKey = "name" | "username" | "email" | "password" | "confirm";

export type SignUpFormProps = {
  onRequestSignIn: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
};

export default function SignUpForm({
  onRequestSignIn,
  rememberMe,
  onRememberMeChange,
}: SignUpFormProps) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.user);

  const [signUpName, setSignUpName] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirm, setShowSignUpConfirm] = useState(false);
  const [signUpErrors, setSignUpErrors] = useState<
    Partial<Record<SignUpFieldKey, string | null>>
  >({});
  const hasSignUpFieldErrors = Object.values(signUpErrors).some(Boolean);

  useAutoDismiss(hasSignUpFieldErrors, () => {
    setSignUpErrors({});
  });

  const clearSignUpField = useCallback((key: SignUpFieldKey) => {
    setSignUpErrors((p) => ({ ...p, [key]: null }));
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setError(null));

    const patch: Partial<Record<SignUpFieldKey, string | null>> = {};
    const ne = getRegisterNameError(signUpName);
    if (ne) patch.name = ne;
    const ue = getRegisterUsernameFormatError(signUpUsername);
    if (ue) patch.username = ue;
    const ee = getRegisterEmailFormatError(signUpEmail);
    if (ee) patch.email = ee;
    const pe = getRegisterPasswordError(signUpPassword);
    if (pe) patch.password = pe;
    const ce = getRegisterConfirmError(signUpPassword, signUpConfirm);
    if (ce) patch.confirm = ce;

    setSignUpErrors((p) => ({ ...p, ...patch }));
    if (Object.keys(patch).length > 0) return;

    try {
      await dispatch(
        registerThunk({
          name: signUpName.trim(),
          username: signUpUsername.trim().toLowerCase(),
          email: signUpEmail.trim(),
          password: signUpPassword,
          rememberMe,
        }),
      ).unwrap();
    } catch {
      /* ошибка уже в store */
    }
  };

  const purpleIcon = (node: ReactNode) => (
    <span className={styles.iconTint}>{node}</span>
  );

  const signUpSubmitDisabled = useMemo(() => {
    if (isLoading) return true;
    if (getRegisterNameError(signUpName)) return true;
    if (getRegisterUsernameFormatError(signUpUsername)) return true;
    if (getRegisterEmailFormatError(signUpEmail)) return true;
    if (getRegisterPasswordError(signUpPassword)) return true;
    if (getRegisterConfirmError(signUpPassword, signUpConfirm)) return true;
    if (Object.values(signUpErrors).some(Boolean)) return true;
    return false;
  }, [
    isLoading,
    signUpName,
    signUpUsername,
    signUpEmail,
    signUpPassword,
    signUpConfirm,
    signUpErrors,
  ]);

  return (
    <>
      <h1 className={styles.title}>Создайте аккаунт</h1>
      <p className={styles.subtitle}>
        Присоединяйтесь к My Work Chat и общайтесь в рабочих чатах
      </p>

      <form className={styles.form} onSubmit={handleSignUp}>
        <AuthField
          label="Имя и фамилия"
          icon={purpleIcon(<User size={20} strokeWidth={2} />)}
          type="text"
          value={signUpName}
          onChange={(v) => {
            setSignUpName(v);
            clearSignUpField("name");
          }}
          onBlurField={() => {
            const err = getRegisterNameError(signUpName);
            setSignUpErrors((p) => ({ ...p, name: err }));
          }}
          autoComplete="name"
          errorMessage={signUpErrors.name}
        />
        <AuthField
          label="Имя пользователя"
          icon={purpleIcon(<AtSign size={20} strokeWidth={2} />)}
          type="text"
          value={signUpUsername}
          onChange={(v) => {
            setSignUpUsername(v);
            clearSignUpField("username");
          }}
          onBlurField={() => {
            const err = getRegisterUsernameFormatError(signUpUsername);
            setSignUpErrors((p) => ({ ...p, username: err }));
          }}
          autoComplete="username"
          errorMessage={signUpErrors.username}
        />
        <AuthField
          label="Email"
          icon={purpleIcon(<Mail size={20} strokeWidth={2} />)}
          type="email"
          value={signUpEmail}
          onChange={(v) => {
            setSignUpEmail(v);
            clearSignUpField("email");
          }}
          onBlurField={() => {
            const err = getRegisterEmailFormatError(signUpEmail);
            setSignUpErrors((p) => ({ ...p, email: err }));
          }}
          autoComplete="email"
          errorMessage={signUpErrors.email}
        />
        <AuthField
          label="Пароль"
          icon={purpleIcon(<Lock size={20} strokeWidth={2} />)}
          type={showSignUpPassword ? "text" : "password"}
          value={signUpPassword}
          onChange={(v) => {
            setSignUpPassword(v);
            clearSignUpField("password");
          }}
          onBlurField={() => {
            const err = getRegisterPasswordError(signUpPassword);
            setSignUpErrors((p) => ({ ...p, password: err }));
          }}
          autoComplete="new-password"
          errorMessage={signUpErrors.password}
          end={
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setShowSignUpPassword((v) => !v)}
              aria-label={
                showSignUpPassword ? "Скрыть пароль" : "Показать пароль"
              }
            >
              {showSignUpPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />
        <AuthField
          label="Подтвердите пароль"
          icon={purpleIcon(<Lock size={20} strokeWidth={2} />)}
          type={showSignUpConfirm ? "text" : "password"}
          value={signUpConfirm}
          onChange={(v) => {
            setSignUpConfirm(v);
            clearSignUpField("confirm");
          }}
          onBlurField={() => {
            const err = getRegisterConfirmError(signUpPassword, signUpConfirm);
            setSignUpErrors((p) => ({ ...p, confirm: err }));
          }}
          autoComplete="new-password"
          errorMessage={signUpErrors.confirm}
          end={
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setShowSignUpConfirm((v) => !v)}
              aria-label={
                showSignUpConfirm ? "Скрыть пароль" : "Показать пароль"
              }
            >
              {showSignUpConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />
        <p className={signUpStyles.hint}>{PASSWORD_RULES_MSG}</p>

        <div className={styles.rowRememberOnly}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
            />
            <span>Запомнить меня</span>
          </label>
        </div>

        <FadeAlert text={error} className={styles.formError} />

        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={signUpSubmitDisabled}
        >
          {isLoading ? (
            <Loader2 className={styles.spin} size={22} />
          ) : (
            "Создать аккаунт"
          )}
        </button>
      </form>

      <p className={signUpStyles.legal}>
        Нажимая «Создать аккаунт», вы принимаете{" "}
        <a href="#" target="_blank" rel="noopener noreferrer">
          Пользовательское соглашение
        </a>{" "}
        и{" "}
        <a href="#" target="_blank" rel="noopener noreferrer">
          Политику конфиденциальности
        </a>
        .
      </p>

      <div className={styles.divider}>
        <span />
        <span className={styles.dividerText}>
          Уже есть аккаунт?{" "}
          <button
            type="button"
            className={styles.inlineLink}
            onClick={onRequestSignIn}
          >
            Войти
          </button>
        </span>
        <span />
      </div>
    </>
  );
}
