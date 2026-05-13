"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import { loginThunk, registerThunk } from "@/entities/user/api/UserApiThunk";
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
import styles from "./EduChatAuthScreen.module.css";

type Mode = "login" | "register";

type RegFieldKey = "name" | "username" | "email" | "password" | "confirm";

type EduChatAuthScreenProps = {
  hideBack?: boolean;
};

type FieldProps = {
  label: string;
  icon: ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  end?: ReactNode;
  errorMessage?: string | null;
  onBlurField?: () => void;
  onFocusField?: () => void;
  isChecking?: boolean;
};

function AuthField({
  label,
  icon,
  type,
  value,
  onChange,
  autoComplete,
  end,
  errorMessage,
  onBlurField,
  onFocusField,
  isChecking,
}: FieldProps) {
  const invalid = Boolean(errorMessage);
  return (
    <div className={styles.field}>
      <div
        className={`${styles.fieldRow} ${invalid ? styles.fieldRowInvalid : ""}`}
      >
        <span className={styles.fieldIcon}>{icon}</span>
        <div className={styles.fieldStack}>
          <span className={styles.fieldLabelInside}>{label}</span>
          <input
            className={styles.fieldInputInside}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlurField}
            onFocus={onFocusField}
            autoComplete={autoComplete}
          />
        </div>
        {isChecking ? (
          <span className={styles.fieldCheckSpinner} aria-hidden>
            <Loader2 className={styles.checkSpin} size={18} />
          </span>
        ) : null}
        {end ? <span className={styles.fieldEnd}>{end}</span> : null}
      </div>
      {errorMessage ? (
        <p className={styles.fieldError} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export default function EduChatAuthScreen({
  hideBack = false,
}: EduChatAuthScreenProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.user);

  const [mode, setMode] = useState<Mode>("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginFieldErrors, setLoginFieldErrors] = useState<{
    email?: string | null;
    password?: string | null;
  }>({});

  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regErrors, setRegErrors] = useState<
    Partial<Record<RegFieldKey, string | null>>
  >({});
  const [emailChecking, setEmailChecking] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const emailCheckGen = useRef(0);
  const usernameCheckGen = useRef(0);

  const clearRegField = useCallback((key: RegFieldKey) => {
    setRegErrors((p) => ({ ...p, [key]: null }));
  }, []);

  const runEmailValidation = useCallback(async (raw: string): Promise<boolean> => {
    const gen = ++emailCheckGen.current;
    const formatErr = getRegisterEmailFormatError(raw);
    if (formatErr) {
      if (gen === emailCheckGen.current) {
        setRegErrors((p) => ({ ...p, email: formatErr }));
      }
      return false;
    }
    if (gen === emailCheckGen.current) {
      setRegErrors((p) => ({ ...p, email: null }));
    }
    setEmailChecking(true);
    try {
      const res = await checkEmailAvailability(raw);
      if (gen !== emailCheckGen.current) return false;
      if (!res.formatOk) {
        setRegErrors((p) => ({
          ...p,
          email: res.message ?? "Некорректный email",
        }));
        return false;
      }
      if (res.available === false) {
        setRegErrors((p) => ({
          ...p,
          email: res.message ?? "Email уже занят",
        }));
        return false;
      }
      setRegErrors((p) => ({ ...p, email: null }));
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
          setRegErrors((p) => ({ ...p, username: formatErr }));
        }
        return false;
      }
      if (gen === usernameCheckGen.current) {
        setRegErrors((p) => ({ ...p, username: null }));
      }
      setUsernameChecking(true);
      try {
        const res = await checkUsernameAvailability(raw);
        if (gen !== usernameCheckGen.current) return false;
        if (!res.formatOk) {
          setRegErrors((p) => ({
            ...p,
            username: res.message ?? "Некорректное имя пользователя",
          }));
          return false;
        }
        if (res.available === false) {
          setRegErrors((p) => ({
            ...p,
            username: res.message ?? "Имя уже занято",
          }));
          return false;
        }
        setRegErrors((p) => ({ ...p, username: null }));
        return true;
      } finally {
        if (gen === usernameCheckGen.current) setUsernameChecking(false);
      }
    },
    [],
  );

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("educhat_email")
        : null;
    if (saved) setLoginEmail(saved);
  }, []);

  useEffect(() => {
    dispatch(setError(null));
    setRegErrors({});
    setLoginFieldErrors({});
  }, [mode, dispatch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setError(null));
    const le = getRegisterEmailFormatError(loginEmail);
    const lp =
      !loginPassword || loginPassword.trim().length === 0
        ? "Введите пароль"
        : null;
    setLoginFieldErrors({ email: le, password: lp });
    if (le || lp) return;

    try {
      await dispatch(
        loginThunk({
          email: loginEmail.trim(),
          password: loginPassword,
          rememberMe,
        }),
      ).unwrap();
      if (rememberMe) localStorage.setItem("educhat_email", loginEmail.trim());
      else localStorage.removeItem("educhat_email");
    } catch {
      /* ошибка уже в store */
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setError(null));

    const patch: Partial<Record<RegFieldKey, string | null>> = {};
    const ne = getRegisterNameError(regName);
    if (ne) patch.name = ne;
    const ue = getRegisterUsernameFormatError(regUsername);
    if (ue) patch.username = ue;
    const ee = getRegisterEmailFormatError(regEmail);
    if (ee) patch.email = ee;
    const pe = getRegisterPasswordError(regPassword);
    if (pe) patch.password = pe;
    const ce = getRegisterConfirmError(regPassword, regConfirm);
    if (ce) patch.confirm = ce;

    setRegErrors((p) => ({ ...p, ...patch }));
    if (Object.keys(patch).length > 0) return;

    const okEmail = await runEmailValidation(regEmail);
    const okUser = await runUsernameValidation(regUsername);
    if (!okEmail || !okUser) return;

    const pe2 = getRegisterPasswordError(regPassword);
    if (pe2) {
      setRegErrors((p) => ({ ...p, password: pe2 }));
      return;
    }
    const ce2 = getRegisterConfirmError(regPassword, regConfirm);
    if (ce2) {
      setRegErrors((p) => ({ ...p, confirm: ce2 }));
      return;
    }

    try {
      await dispatch(
        registerThunk({
          name: regName.trim(),
          username: regUsername.trim().toLowerCase(),
          email: regEmail.trim(),
          password: regPassword,
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

  const loginSubmitDisabled = useMemo(() => {
    if (isLoading) return true;
    if (!loginEmail.trim() || !loginPassword.trim()) return true;
    if (getRegisterEmailFormatError(loginEmail)) return true;
    return false;
  }, [isLoading, loginEmail, loginPassword]);

  const registerSubmitDisabled = useMemo(() => {
    if (isLoading || emailChecking || usernameChecking) return true;
    if (getRegisterNameError(regName)) return true;
    if (getRegisterUsernameFormatError(regUsername)) return true;
    if (getRegisterEmailFormatError(regEmail)) return true;
    if (getRegisterPasswordError(regPassword)) return true;
    if (getRegisterConfirmError(regPassword, regConfirm)) return true;
    if (Object.values(regErrors).some(Boolean)) return true;
    return false;
  }, [
    isLoading,
    emailChecking,
    usernameChecking,
    regName,
    regUsername,
    regEmail,
    regPassword,
    regConfirm,
    regErrors,
  ]);

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

        {mode === "login" ? (
          <>
            <h1 className={styles.title}>Войти в аккаунт</h1>
            <p className={styles.subtitle}>
              Добро пожаловать обратно! Мы рады вас видеть 💜
            </p>

            <form className={styles.form} onSubmit={handleLogin}>
              <AuthField
                label="Email"
                icon={purpleIcon(<Mail size={20} strokeWidth={2} />)}
                type="email"
                value={loginEmail}
                onChange={(v) => {
                  setLoginEmail(v);
                  setLoginFieldErrors((p) => ({ ...p, email: null }));
                }}
                onBlurField={() => {
                  const err = getRegisterEmailFormatError(loginEmail);
                  setLoginFieldErrors((p) => ({ ...p, email: err }));
                }}
                autoComplete="email"
                errorMessage={loginFieldErrors.email}
              />
              <AuthField
                label="Пароль"
                icon={purpleIcon(<Lock size={20} strokeWidth={2} />)}
                type={showLoginPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(v) => {
                  setLoginPassword(v);
                  setLoginFieldErrors((p) => ({ ...p, password: null }));
                }}
                onBlurField={() => {
                  const err =
                    !loginPassword || loginPassword.length === 0
                      ? "Введите пароль"
                      : null;
                  setLoginFieldErrors((p) => ({ ...p, password: err }));
                }}
                autoComplete="current-password"
                errorMessage={loginFieldErrors.password}
                end={
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setShowLoginPassword((v) => !v)}
                    aria-label={
                      showLoginPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                  >
                    {showLoginPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                }
              />

              <div className={styles.rowBetween}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
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
                disabled={loginSubmitDisabled}
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
                  onClick={() => setMode("register")}
                >
                  Зарегистрироваться
                </button>
              </span>
              <span />
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Создайте аккаунт</h1>
            <p className={styles.subtitle}>
              Присоединяйтесь к EduChat и общайтесь в учебных чатах
            </p>

            <form className={styles.form} onSubmit={handleRegister}>
              <AuthField
                label="Имя и фамилия"
                icon={purpleIcon(<User size={20} strokeWidth={2} />)}
                type="text"
                value={regName}
                onChange={(v) => {
                  setRegName(v);
                  clearRegField("name");
                }}
                onBlurField={() => {
                  const err = getRegisterNameError(regName);
                  setRegErrors((p) => ({ ...p, name: err }));
                }}
                autoComplete="name"
                errorMessage={regErrors.name}
              />
              <AuthField
                label="Имя пользователя"
                icon={purpleIcon(<AtSign size={20} strokeWidth={2} />)}
                type="text"
                value={regUsername}
                onChange={(v) => {
                  setRegUsername(v);
                  clearRegField("username");
                }}
                onBlurField={() => {
                  void runUsernameValidation(regUsername);
                }}
                autoComplete="username"
                errorMessage={regErrors.username}
                isChecking={usernameChecking}
              />
              <AuthField
                label="Email"
                icon={purpleIcon(<Mail size={20} strokeWidth={2} />)}
                type="email"
                value={regEmail}
                onChange={(v) => {
                  setRegEmail(v);
                  clearRegField("email");
                }}
                onBlurField={() => {
                  void runEmailValidation(regEmail);
                }}
                autoComplete="email"
                errorMessage={regErrors.email}
                isChecking={emailChecking}
              />
              <AuthField
                label="Пароль"
                icon={purpleIcon(<Lock size={20} strokeWidth={2} />)}
                type={showRegPassword ? "text" : "password"}
                value={regPassword}
                onChange={(v) => {
                  setRegPassword(v);
                  clearRegField("password");
                }}
                onBlurField={() => {
                  const err = getRegisterPasswordError(regPassword);
                  setRegErrors((p) => ({ ...p, password: err }));
                }}
                onFocusField={() => {
                  void runEmailValidation(regEmail);
                }}
                autoComplete="new-password"
                errorMessage={regErrors.password}
                end={
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setShowRegPassword((v) => !v)}
                    aria-label={
                      showRegPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                  >
                    {showRegPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
              />
              <p className={styles.hint}>{PASSWORD_RULES_MSG}</p>
              <AuthField
                label="Подтвердите пароль"
                icon={purpleIcon(<Lock size={20} strokeWidth={2} />)}
                type={showRegConfirm ? "text" : "password"}
                value={regConfirm}
                onChange={(v) => {
                  setRegConfirm(v);
                  clearRegField("confirm");
                }}
                onBlurField={() => {
                  const err = getRegisterConfirmError(regPassword, regConfirm);
                  setRegErrors((p) => ({ ...p, confirm: err }));
                }}
                onFocusField={() => {
                  const pe = getRegisterPasswordError(regPassword);
                  setRegErrors((p) => ({ ...p, password: pe }));
                }}
                autoComplete="new-password"
                errorMessage={regErrors.confirm}
                end={
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setShowRegConfirm((v) => !v)}
                    aria-label={
                      showRegConfirm ? "Скрыть пароль" : "Показать пароль"
                    }
                  >
                    {showRegConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
              />

              <div className={styles.rowRememberOnly}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Запомнить меня</span>
                </label>
              </div>

              {error ? <p className={styles.formError}>{error}</p> : null}

              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={registerSubmitDisabled}
              >
                {isLoading ? (
                  <Loader2 className={styles.spin} size={22} />
                ) : (
                  "Создать аккаунт"
                )}
              </button>
            </form>

            <p className={styles.legal}>
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
                  onClick={() => setMode("login")}
                >
                  Войти
                </button>
              </span>
              <span />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
