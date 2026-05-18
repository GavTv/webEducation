"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./ClassManageModal.module.css";

type ClassJoinPasswordModalProps = {
  open: boolean;
  classTitle: string;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (password: string) => void;
};

export function ClassJoinPasswordModal({
  open,
  classTitle,
  saving,
  error,
  onClose,
  onSubmit,
}: ClassJoinPasswordModalProps) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) setPassword("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-class-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="join-class-title" className={styles.title}>
          Вход в класс
        </h2>
        <p className={styles.hint}>
          Для входа в «{classTitle}» введите пароль, который выдал учитель.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Пароль класса
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Проверка…" : "Войти в класс"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
