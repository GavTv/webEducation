"use client";

import { useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import styles from "./ConfirmModal.module.css";

type ConfirmModalProps = {
  title: string;
  lines: string[];
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
  errorMessage?: string | null;
};

export function ConfirmModal({
  title,
  lines,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isBusy = false,
  errorMessage = null,
}: ConfirmModalProps) {
  const onBackdropMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !isBusy) onCancel();
    },
    [isBusy, onCancel],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isBusy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isBusy, onCancel]);

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className={styles.title}>
          {title}
        </h2>
        {lines.map((line, index) => (
          <p key={index} className={styles.text}>
            {line}
          </p>
        ))}
        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.confirm}`}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? (
              <Loader2 className={styles.spin} size={20} aria-hidden />
            ) : null}
            {confirmLabel}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.cancel}`}
            onClick={onCancel}
            disabled={isBusy}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
