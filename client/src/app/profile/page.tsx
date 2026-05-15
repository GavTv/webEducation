"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import {
  deleteAccountThunk,
  logoutThunk,
} from "@/entities/user/api/UserApiThunk";
import { setError } from "@/entities/user/slice/userSlice";
import { ConfirmModal } from "@/shared/ui/ConfirmModal/ConfirmModal";
import "./page.css";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.user.user);
  const isInitialized = useAppSelector((s) => s.user.isInitialized);
  const isLoading = useAppSelector((s) => s.user.isLoading);
  const authError = useAppSelector((s) => s.user.error);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/");
    }
  }, [isInitialized, user, router]);

  const handleBack = useCallback(() => {
    router.push(clientRoutes.classes);
  }, [router]);

  const handleLogout = useCallback(() => {
    dispatch(logoutThunk())
      .unwrap()
      .then(() => {
        router.push("/");
      })
      .catch(() => {});
  }, [dispatch, router]);

  const handleOpenDelete = useCallback(() => {
    dispatch(setError(null));
    setDeleteModalOpen(true);
  }, [dispatch]);

  const handleCloseDelete = useCallback(() => {
    if (!isLoading) {
      dispatch(setError(null));
      setDeleteModalOpen(false);
    }
  }, [dispatch, isLoading]);

  const handleConfirmDelete = useCallback(() => {
    dispatch(deleteAccountThunk())
      .unwrap()
      .then(() => {
        setDeleteModalOpen(false);
        router.push("/");
      })
      .catch(() => {});
  }, [dispatch, router]);

  if (!isInitialized || !user) {
    return (
      <main className="profile-page profile-page--centered">
        <div className="profile-loading" aria-busy="true">
          <Loader2 className="profile-loading-spin" size={32} />
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      {deleteModalOpen ? (
        <ConfirmModal
          title="Вы точно хотите удалить свой аккаунт?"
          lines={[
            "Внимание! Все ваши данные будут удалены безвозвратно.",
          ]}
          confirmLabel="Подтвердить"
          cancelLabel="Отмена"
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseDelete}
          isBusy={isLoading}
          errorMessage={authError}
        />
      ) : null}

      <section className="profile-card">
        <div className="profile-card-topbar">
          <button type="button" className="back-btn" onClick={handleBack}>
            Назад
          </button>
          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading && !deleteModalOpen ? (
              <Loader2 className="profile-btn-spin" size={18} aria-hidden />
            ) : null}
            Выйти
          </button>
        </div>

        <header className="profile-header">
          <h1>Профиль</h1>
        </header>

        <section className="profile-top">
          <div className="avatar-box">
            <img src="/avatar.jpg" alt="Фото профиля" />
            <button type="button" className="camera-btn" aria-label="Сменить фото">
              📷
            </button>
          </div>

          <div className="profile-identity">
            <h2>{user.name}</h2>
            <p>@{user.username}</p>
          </div>
        </section>

        <section className="profile-content">
          <div className="info-section">
            <h3>Личная информация</h3>

            <div className="info-grid">
              <div className="info-card">
                <span>Имя</span>
                <strong>{user.name.split(/\s+/)[0] ?? user.name}</strong>
                <button type="button" aria-label="Редактировать имя">
                  ✎
                </button>
              </div>

              <div className="info-card">
                <span>Фамилия</span>
                <strong>
                  {user.name.split(/\s+/).slice(1).join(" ") || "—"}
                </strong>
                <button type="button" aria-label="Редактировать фамилию">
                  ✎
                </button>
              </div>

              <div className="info-card wide">
                <span>Отчество</span>
                <strong>—</strong>
                <button type="button" aria-label="Редактировать отчество">
                  ✎
                </button>
              </div>
            </div>

            <p className="hint">
              Вы можете изменить ФИО. Никнейм используется как постоянный
              идентификатор и не редактируется.
            </p>

            <div className="danger-zone">
              <button
                type="button"
                className="delete-account-btn"
                onClick={handleOpenDelete}
                disabled={isLoading}
              >
                Удалить аккаунт
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
