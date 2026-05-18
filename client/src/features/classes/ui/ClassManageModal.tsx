"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./ClassManageModal.module.css";

export type ClassManageModalMode = "create" | "edit" | "password";

type ClassManageModalProps = {
  open: boolean;
  mode: ClassManageModalMode;
  initialTitle?: string;
  initialDescription?: string;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    joinPassword: string;
  }) => void;
};

export function ClassManageModal({
  open,
  mode,
  initialTitle = "",
  initialDescription = "",
  saving,
  error,
  onClose,
  onSubmit,
}: ClassManageModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [joinPassword, setJoinPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setDescription(initialDescription);
    setJoinPassword("");
  }, [open, initialTitle, initialDescription, mode]);

  if (!open) return null;

  const heading =
    mode === "create"
      ? "Новый класс"
      : mode === "edit"
        ? "Редактировать класс"
        : "Пароль для входа в класс";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ title, description, joinPassword });
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="class-modal-title" className={styles.title}>
          {heading}
        </h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode !== "password" ? (
            <>
              <label className={styles.label}>
                Название
                <input
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={120}
                />
              </label>
              <label className={styles.label}>
                Описание
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                />
              </label>
            </>
          ) : null}

          {mode === "create" || mode === "password" ? (
            <label className={styles.label}>
              {mode === "password"
                ? "Новый пароль (оставьте пустым, чтобы убрать)"
                : "Пароль для входа (необязательно)"}
              <input
                className={styles.input}
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
          ) : null}

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
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
