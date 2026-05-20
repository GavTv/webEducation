"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, Mail } from "lucide-react";
import { AuthField } from "@/features/auth/shared/AuthField";
import { useAutoDismiss } from "@/shared/hooks/useAutoDismiss";
import { FadeAlert } from "@/shared/ui/FadeAlert/FadeAlert";
import styles from "@/features/auth/shared/eduChatForm.module.css";
import otpStyles from "./ForgotPasswordForm.module.css";
import { getRegisterEmailFormatError } from "@/shared/lib/registerFieldValidators";
import {
  postForgotPassword,
  postVerifyResetCode,
} from "@/shared/lib/passwordResetApi";

type Step = "email" | "code";

const OTP_LEN = 6;
const RESEND_COOLDOWN_SEC = 60;

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type OtpSixProps = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
};

function OtpSix({ value, onChange, disabled, invalid }: OtpSixProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.replace(/\D/g, "").slice(0, OTP_LEN);

  const updateFull = useCallback(
    (next: string) => {
      onChange(next.replace(/\D/g, "").slice(0, OTP_LEN));
    },
    [onChange],
  );

  const focusAt = useCallback((i: number) => {
    const el = refs.current[Math.max(0, Math.min(OTP_LEN - 1, i))];
    requestAnimationFrame(() => {
      el?.focus();
      el?.select();
    });
  }, []);

  const handleInput = useCallback(
    (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      if (raw.length > 1) {
        updateFull(raw);
        focusAt(Math.min(OTP_LEN - 1, raw.length));
        return;
      }
      if (raw.length === 0) {
        const prefix = digits.slice(0, i);
        const suffix = digits.slice(i + 1);
        updateFull(prefix + suffix);
        return;
      }
      const ch = raw.slice(-1);
      const prefix = digits.slice(0, i);
      const suffix = digits.slice(i + 1);
      updateFull((prefix + ch + suffix).slice(0, OTP_LEN));
      if (ch && i < OTP_LEN - 1) focusAt(i + 1);
    },
    [digits, focusAt, updateFull],
  );

  const handleKeyDown = useCallback(
    (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        const cur = digits[i];
        if (!cur && i > 0) {
          e.preventDefault();
          const prefix = digits.slice(0, i - 1);
          const suffix = digits.slice(i);
          updateFull(prefix + suffix);
          focusAt(i - 1);
        }
      } else if (e.key === "ArrowLeft" && i > 0) {
        e.preventDefault();
        focusAt(i - 1);
      } else if (e.key === "ArrowRight" && i < OTP_LEN - 1) {
        e.preventDefault();
        focusAt(i + 1);
      }
    },
    [digits, focusAt, updateFull],
  );

  const onPasteFirst = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const paste = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, OTP_LEN);
      updateFull(paste);
      focusAt(Math.min(OTP_LEN - 1, paste.length));
    },
    [focusAt, updateFull],
  );

  return (
    <div
      className={`${otpStyles.otpWrap} ${invalid ? otpStyles.otpRowInvalid : ""}`}
    >
      <span className={otpStyles.otpLabel}>Код из письма</span>
      <div
        className={otpStyles.otpRow}
        role="group"
        aria-label="Введите код из 6 цифр"
      >
        {Array.from({ length: OTP_LEN }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={otpStyles.otpCell}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digits[i] ?? ""}
            disabled={disabled}
            onChange={(e) => handleInput(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? onPasteFirst : undefined}
            aria-label={`Цифра ${i + 1} из ${OTP_LEN}`}
          />
        ))}
      </div>
    </div>
  );
}

export type ForgotPasswordFormProps = {
  onBackToSignIn: () => void;
  /** После проверки кода — переход на `/reset-password?token=…` */
  onCodeVerified: (resetToken: string) => void;
};

export default function ForgotPasswordForm({
  onBackToSignIn,
  onCodeVerified,
}: ForgotPasswordFormProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string | null;
    code?: string | null;
  }>({});

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);

  useAutoDismiss(hasFieldErrors, () => {
    setFieldErrors({});
  });

  useAutoDismiss(Boolean(formError), () => {
    setFormError(null);
  });

  useEffect(() => {
    if (cooldownSec <= 0) return undefined;
    const id = window.setInterval(() => {
      setCooldownSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownSec > 0]);

  const purpleIcon = (node: ReactNode) => (
    <span className={styles.iconTint}>{node}</span>
  );

  const startCooldown = useCallback(() => {
    setCooldownSec(RESEND_COOLDOWN_SEC);
  }, []);

  const sendCodeToEmail = useCallback(async () => {
    await postForgotPassword(email.trim());
    setStep("code");
    setCode("");
    startCooldown();
  }, [email, startCooldown]);

  const sendCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      const ee = getRegisterEmailFormatError(email);
      setFieldErrors({ email: ee });
      if (ee) return;
      setIsSubmitting(true);
      try {
        await sendCodeToEmail();
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Не удалось отправить код",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, sendCodeToEmail],
  );

  const handleResend = useCallback(async () => {
    if (cooldownSec > 0 || isSubmitting) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await postForgotPassword(email.trim());
      startCooldown();
      setCode("");
      setFieldErrors((p) => ({ ...p, code: null }));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Не удалось отправить код",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [cooldownSec, email, isSubmitting, startCooldown]);

  const verifyCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      const digits = code.replace(/\D/g, "").slice(0, OTP_LEN);
      const ce =
        digits.length !== OTP_LEN ? "Введите все 6 цифр из письма" : null;
      setFieldErrors({ code: ce });
      if (ce) return;
      setIsSubmitting(true);
      try {
        const token = await postVerifyResetCode(email.trim(), digits);
        onCodeVerified(token);
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Неверный или просроченный код",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [code, email, onCodeVerified],
  );

  const emailSubmitDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (!email.trim()) return true;
    if (getRegisterEmailFormatError(email)) return true;
    return false;
  }, [email, isSubmitting]);

  const codeSubmitDisabled = useMemo(() => {
    if (isSubmitting) return true;
    return code.replace(/\D/g, "").length !== OTP_LEN;
  }, [code, isSubmitting]);

  const codeInvalid = Boolean(fieldErrors.code);

  return (
    <>
      <h1 className={styles.title}>Восстановление пароля</h1>
      <p className={styles.subtitle}>
        {step === "email"
          ? "Укажите email, который использовался при регистрации, и мы вышлем на него письмо для смены пароля."
          : "Введите 6 цифр из письма."}
      </p>

      {step === "email" ? (
        <form className={styles.form} onSubmit={sendCode}>
          <AuthField
            label="Email"
            icon={purpleIcon(<Mail size={20} strokeWidth={2} />)}
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              setFieldErrors((p) => ({ ...p, email: null }));
            }}
            onBlurField={() => {
              setFieldErrors((p) => ({
                ...p,
                email: getRegisterEmailFormatError(email),
              }));
            }}
            autoComplete="email"
            errorMessage={fieldErrors.email}
          />
          {formError ? <p className={styles.formError}>{formError}</p> : null}
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={emailSubmitDisabled}
          >
            {isSubmitting ? (
              <Loader2 className={styles.spin} size={22} />
            ) : (
              "Отправить код"
            )}
          </button>
          <button
            type="button"
            className={styles.linkBtn}
            style={{ marginTop: 12, alignSelf: "center" }}
            onClick={onBackToSignIn}
          >
            Назад ко входу
          </button>
        </form>
      ) : null}

      {step === "code" ? (
        <form className={styles.form} onSubmit={verifyCode}>
          <OtpSix
            value={code}
            onChange={(v) => {
              setCode(v);
              setFieldErrors((p) => ({ ...p, code: null }));
            }}
            disabled={isSubmitting}
            invalid={codeInvalid}
          />
          <FadeAlert text={fieldErrors.code} className={styles.fieldError} />
          <FadeAlert text={formError} className={styles.formError} />

          <div className={otpStyles.resendRow}>
            <button
              type="button"
              className={otpStyles.resendBtn}
              disabled={cooldownSec > 0 || isSubmitting}
              onClick={handleResend}
            >
              Отправить код повторно
            </button>
            {cooldownSec > 0 ? (
              <span className={otpStyles.cooldown}>
                Повторная отправка через {formatMmSs(cooldownSec)}
              </span>
            ) : null}
          </div>

          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={codeSubmitDisabled}
          >
            {isSubmitting ? (
              <Loader2 className={styles.spin} size={22} />
            ) : (
              "Проверить код"
            )}
          </button>
          <button
            type="button"
            className={styles.linkBtn}
            style={{ marginTop: 12, alignSelf: "center" }}
            onClick={() => {
              setFormError(null);
              setCooldownSec(0);
              setStep("email");
            }}
          >
            Другой email
          </button>
        </form>
      ) : null}
    </>
  );
}
