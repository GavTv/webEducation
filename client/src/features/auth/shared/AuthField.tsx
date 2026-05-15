"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import styles from "./eduChatForm.module.css";

export type AuthFieldProps = {
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
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  /** Border/state invalid, but error text is rendered elsewhere (e.g. under «Забыли пароль?»). */
  hideInlineError?: boolean;
};

export function AuthField({
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
  maxLength,
  inputMode,
  pattern,
  hideInlineError,
}: AuthFieldProps) {
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
            maxLength={maxLength}
            inputMode={inputMode}
            pattern={pattern}
          />
        </div>
        {isChecking ? (
          <span className={styles.fieldCheckSpinner} aria-hidden>
            <Loader2 className={styles.checkSpin} size={18} />
          </span>
        ) : null}
        {end ? <span className={styles.fieldEnd}>{end}</span> : null}
      </div>
      {errorMessage && !hideInlineError ? (
        <p className={styles.fieldError} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
