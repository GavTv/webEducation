"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
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
import {
  checkEmailAvailability,
  checkUsernameAvailability,
} from "@/shared/lib/authAvailabilityApi";
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
  const [emailChecking, setEmailChecking] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const emailCheckGen = useRef(0);
  const usernameCheckGen = useRef(0);

  const clearSignUpField = useCallback((key: SignUpFieldKey) => {
    setSignUpErrors((p) => ({ ...p, [key]: null }));
  }, []);

  const runEmailValidation = useCallback(async (raw: string): Promise<boolean> => {
    const gen = ++emailCheckGen.current;
    const formatErr = getRegisterEmailFormatError(raw);
    if (formatErr) {
      if (gen === emailCheckGen.current) {
        setSignUpErrors((p) => ({ ...p, email: formatErr }));
      }
      return false;
    }
    if (gen === emailCheckGen.current) {
      setSignUpErrors((p) => ({ ...p, email: null }));
    }
    setEmailChecking(true);
    try {
      const res = await checkEmailAvailability(raw);
      if (gen !== emailCheckGen.current) return false;
      if (!res.formatOk) {
        setSignUpErrors((p) => ({
          ...p,
          email: res.message ?? "Некорректный email",
        }));
        return false;
      }
      if (res.available === false) {
        setSignUpErrors((p) => ({
          ...p,
          email: res.message ?? "Email уже занят",
        }));
        return false;
      }
      setSignUpErrors((p) => ({ ...p, email: null }));
      return true;
    } finally {
      if (gen === emailCheckGen.current) setEmailChecking(false);
    }
  }, []);

  const runUsernameValidation = useCallback(
    async (raw: string): Promise<boolean> => {
      const gen = ++usernameCheckGen.current;
      const formatErr = getRegisterUsernameFormatError(raw);
      if (formatErr) {
        if (gen === usernameCheckGen.current) {
          setSignUpErrors((p) => ({ ...p, username: formatErr }));
        }
        return false;
      }
      if (gen === usernameCheckGen.current) {
        setSignUpErrors((p) => ({ ...p, username: null }));
      }
      setUsernameChecking(true);
      try {
        const res = await checkUsernameAvailability(raw);
        if (gen !== usernameCheckGen.current) return false;
        if (!res.formatOk) {
          setSignUpErrors((p) => ({
            ...p,
            username: res.message ?? "Некорректное имя пользователя",
          }));
          return false;
        }
        if (res.available === false) {
          setSignUpErrors((p) => ({
            ...p,
            username: res.message ?? "Имя уже занято",
          }));
          return false;
        }
        setSignUpErrors((p) => ({ ...p, username: null }));
        return true;
      } finally {
        if (gen === usernameCheckGen.current) setUsernameChecking(false);
      }
    },
    [],
  );

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

    const okEmail = await runEmailValidation(signUpEmail);
    const okUser = await runUsernameValidation(signUpUsername);
    if (!okEmail || !okUser) return;

    const pe2 = getRegisterPasswordError(signUpPassword);
    if (pe2) {
      setSignUpErrors((p) => ({ ...p, password: pe2 }));
      return;
    }
    const ce2 = getRegisterConfirmError(signUpPassword, signUpConfirm);
    if (ce2) {
      setSignUpErrors((p) => ({ ...p, confirm: ce2 }));
      return;
    }

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
    if (isLoading || emailChecking || usernameChecking) return true;
    if (getRegisterNameError(signUpName)) return true;
    if (getRegisterUsernameFormatError(signUpUsername)) return true;
    if (getRegisterEmailFormatError(signUpEmail)) return true;
    if (getRegisterPasswordError(signUpPassword)) return true;
    if (getRegisterConfirmError(signUpPassword, signUpConfirm)) return true;
    if (Object.values(signUpErrors).some(Boolean)) return true;
    return false;
  }, [
    isLoading,
    emailChecking,
    usernameChecking,
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
        Присоединяйтесь к EduChat и общайтесь в учебных чатах
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
            void runUsernameValidation(signUpUsername);
          }}
          autoComplete="username"
          errorMessage={signUpErrors.username}
          isChecking={usernameChecking}
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
            void runEmailValidation(signUpEmail);
          }}
          autoComplete="email"
          errorMessage={signUpErrors.email}
          isChecking={emailChecking}
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
          onFocusField={() => {
            void runEmailValidation(signUpEmail);
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
          onFocusField={() => {
            const pe = getRegisterPasswordError(signUpPassword);
            setSignUpErrors((p) => ({ ...p, password: pe }));
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

        {error ? <p className={styles.formError}>{error}</p> : null}

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
        <a
          href="https://elbrusboot.camp/docs/end_user_license_agreement.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          Пользовательское соглашение
        </a>{" "}
        и{" "}
        <a
          href="https://elbrusboot.camp/privacy-policy/"
          target="_blank"
          rel="noopener noreferrer"
        >
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
