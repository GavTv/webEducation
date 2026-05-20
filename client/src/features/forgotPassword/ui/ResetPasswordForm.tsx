"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { AuthField } from "@/features/auth/shared/AuthField";
import { useAutoDismiss } from "@/shared/hooks/useAutoDismiss";
import styles from "@/features/auth/shared/eduChatForm.module.css";
import {
  getRegisterConfirmError,
  getRegisterPasswordError,
} from "@/shared/lib/registerFieldValidators";
import { postResetPasswordWithToken } from "@/shared/lib/passwordResetApi";

export type ResetPasswordFormProps = {
  resetToken: string;
  onSuccess: () => void;
};

export default function ResetPasswordForm({
  resetToken,
  onSuccess,
}: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string | null;
    confirm?: string | null;
  }>({});

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);

  useAutoDismiss(hasFieldErrors, () => {
    setFieldErrors({});
  });

  useAutoDismiss(Boolean(formError), () => {
    setFormError(null);
  });

  const purpleIcon = (node: ReactNode) => (
    <span className={styles.iconTint}>{node}</span>
  );

  const submitNewPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      const pe = getRegisterPasswordError(newPassword);
      const ce = getRegisterConfirmError(newPassword, confirmPassword);
      setFieldErrors({ password: pe, confirm: ce });
      if (pe || ce) return;
      setIsSubmitting(true);
      try {
        await postResetPasswordWithToken(resetToken, newPassword);
        onSuccess();
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Не удалось сменить пароль",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [confirmPassword, newPassword, onSuccess, resetToken],
  );

  const passwordSubmitDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (!newPassword || !confirmPassword) return true;
    if (getRegisterPasswordError(newPassword)) return true;
    if (getRegisterConfirmError(newPassword, confirmPassword)) return true;
    return false;
  }, [confirmPassword, isSubmitting, newPassword]);

  return (
    <>
      <h1 className={styles.title}>Новый пароль</h1>
      <p className={styles.subtitle}>Придумайте новый пароль для входа.</p>

      <form className={styles.form} onSubmit={submitNewPassword}>
        <AuthField
          label="Новый пароль"
          icon={purpleIcon(<Lock size={20} strokeWidth={2} />)}
          type={showPw ? "text" : "password"}
          value={newPassword}
          onChange={(v) => {
            setNewPassword(v);
            setFieldErrors((p) => ({ ...p, password: null }));
          }}
          onBlurField={() => {
            setFieldErrors((p) => ({
              ...p,
              password: getRegisterPasswordError(newPassword),
            }));
          }}
          autoComplete="new-password"
          errorMessage={fieldErrors.password}
          end={
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />
        <AuthField
          label="Повторите пароль"
          icon={purpleIcon(<Lock size={20} strokeWidth={2} />)}
          type={showPw2 ? "text" : "password"}
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            setFieldErrors((p) => ({ ...p, confirm: null }));
          }}
          onBlurField={() => {
            setFieldErrors((p) => ({
              ...p,
              confirm: getRegisterConfirmError(newPassword, confirmPassword),
            }));
          }}
          autoComplete="new-password"
          errorMessage={fieldErrors.confirm}
          end={
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setShowPw2((v) => !v)}
              aria-label={showPw2 ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPw2 ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />
        {formError ? <p className={styles.formError}>{formError}</p> : null}
        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={passwordSubmitDisabled}
        >
          {isSubmitting ? (
            <Loader2 className={styles.spin} size={22} />
          ) : (
            "Сохранить пароль"
          )}
        </button>
      </form>
    </>
  );
}
