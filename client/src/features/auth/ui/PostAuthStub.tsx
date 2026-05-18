"use client";

import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import { logoutThunk } from "@/entities/user/api/UserApiThunk";
import { Loader2 } from "lucide-react";
import styles from "./PostAuthStub.module.css";

export default function PostAuthStub() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.user.user);
  const isLoading = useAppSelector((s) => s.user.isLoading);

  const handleLogout = () => {
    dispatch(logoutThunk());
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img
          src="/educhat-logo.png?v=2"
          alt="EduChat"
          className={styles.brandLogo}
          width={660}
          height={144}
          decoding="async"
        />
        <h1 className={styles.title}>Заглушка</h1>
        <p className={styles.text}>
          Вы успешно вошли. Здесь позже появится основное приложение.
        </p>
        {user ? (
          <p className={styles.user}>
            {user.name} · @{user.username}
          </p>
        ) : null}
        <button
          type="button"
          className={styles.outBtn}
          onClick={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className={styles.spin} size={20} /> : "Выйти"}
        </button>
      </div>
    </div>
  );
}
