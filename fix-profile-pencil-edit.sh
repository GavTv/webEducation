#!/bin/bash

set -e

cd client

cat > src/app/profile/page.tsx <<'EOF'
"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import {
  deleteAccountThunk,
  logoutThunk,
  updateProfileThunk,
} from "@/entities/user/api/UserApiThunk";
import { setError } from "@/entities/user/slice/userSlice";
import { ConfirmModal } from "@/shared/ui/ConfirmModal/ConfirmModal";
import "./page.css";

function getApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
}

function getAvatarSrc(avatarUrl?: string | null) {
  if (!avatarUrl) {
    return "";
  }

  if (avatarUrl.startsWith("http")) {
    return avatarUrl;
  }

  return `${getApiOrigin()}${avatarUrl}`;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts[1] || "",
    patronymic: parts.slice(2).join(" "),
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const firstNameInputRef = useRef<HTMLInputElement | null>(null);
  const lastNameInputRef = useRef<HTMLInputElement | null>(null);

  const user = useAppSelector((s) => s.user.user);
  const isInitialized = useAppSelector((s) => s.user.isInitialized);
  const isLoading = useAppSelector((s) => s.user.isLoading);
  const authError = useAppSelector((s) => s.user.error);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patronymic, setPatronymic] = useState("");

  const [isFirstNameEditable, setIsFirstNameEditable] = useState(false);
  const [isLastNameEditable, setIsLastNameEditable] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/");
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (user) {
      const parsedName = splitName(user.name);

      setFirstName(parsedName.firstName);
      setLastName(parsedName.lastName);
      setPatronymic(parsedName.patronymic);

      setIsFirstNameEditable(false);
      setIsLastNameEditable(false);

      setAvatarFile(null);
      setAvatarPreview("");
    }
  }, [user]);

  const avatarSrc = useMemo(() => {
    if (avatarPreview) {
      return avatarPreview;
    }

    return getAvatarSrc(user?.avatarUrl);
  }, [avatarPreview, user?.avatarUrl]);

  const fullName = useMemo(() => {
    return [firstName, lastName, patronymic]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
  }, [firstName, lastName, patronymic]);

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

  const handleAvatarChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;

      setSuccessMessage("");
      dispatch(setError(null));

      if (!file) {
        setAvatarFile(null);
        setAvatarPreview("");
        return;
      }

      if (!file.type.startsWith("image/")) {
        dispatch(setError("Можно загрузить только изображение"));
        event.target.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        dispatch(setError("Файл должен быть не больше 2 МБ"));
        event.target.value = "";
        return;
      }

      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    },
    [dispatch],
  );

  const handleEnableFirstNameEdit = useCallback(() => {
    setIsFirstNameEditable(true);

    setTimeout(() => {
      firstNameInputRef.current?.focus();
      firstNameInputRef.current?.select();
    }, 0);
  }, []);

  const handleEnableLastNameEdit = useCallback(() => {
    setIsLastNameEditable(true);

    setTimeout(() => {
      lastNameInputRef.current?.focus();
      lastNameInputRef.current?.select();
    }, 0);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setSuccessMessage("");
      dispatch(setError(null));

      if (fullName.trim().length < 2) {
        dispatch(setError("ФИО должно быть минимум 2 символа"));
        return;
      }

      dispatch(updateProfileThunk({ name: fullName, avatar: avatarFile }))
        .unwrap()
        .then(() => {
          setAvatarFile(null);
          setAvatarPreview("");
          setIsFirstNameEditable(false);
          setIsLastNameEditable(false);
          setSuccessMessage("Профиль сохранён");
        })
        .catch(() => {});
    },
    [avatarFile, dispatch, fullName],
  );

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
          lines={["Внимание! Все ваши данные будут удалены безвозвратно."]}
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

        <form onSubmit={handleSubmit}>
          <section className="profile-top">
            <label className="avatar-box">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Фото профиля" />
              ) : (
                <div className="avatar-placeholder">Фото профиля</div>
              )}

              <input
                className="avatar-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarChange}
              />

              <span className="camera-btn" aria-label="Сменить фото">
                📷
              </span>
            </label>

            <div className="profile-identity">
              <h2>{fullName || user.name}</h2>
              <p>@{user.username}</p>
            </div>
          </section>

          <section className="profile-content">
            <div className="info-section">
              <h3>Личная информация</h3>

              <div className="info-grid">
                <div className="info-card">
                  <span>Имя</span>

                  <input
                    ref={firstNameInputRef}
                    className="profile-edit-input"
                    value={firstName}
                    readOnly={!isFirstNameEditable}
                    onChange={(event) => {
                      setFirstName(event.target.value);
                      setSuccessMessage("");
                    }}
                    onBlur={() => setIsFirstNameEditable(false)}
                    placeholder="Имя"
                  />

                  <button
                    type="button"
                    aria-label="Редактировать имя"
                    onClick={handleEnableFirstNameEdit}
                  >
                    ✎
                  </button>
                </div>

                <div className="info-card">
                  <span>Фамилия</span>

                  <input
                    ref={lastNameInputRef}
                    className="profile-edit-input"
                    value={lastName}
                    readOnly={!isLastNameEditable}
                    onChange={(event) => {
                      setLastName(event.target.value);
                      setSuccessMessage("");
                    }}
                    onBlur={() => setIsLastNameEditable(false)}
                    placeholder="Фамилия"
                  />

                  <button
                    type="button"
                    aria-label="Редактировать фамилию"
                    onClick={handleEnableLastNameEdit}
                  >
                    ✎
                  </button>
                </div>

                <div className="info-card wide">
                  <span>Отчество</span>

                  <input
                    className="profile-edit-input"
                    value={patronymic}
                    readOnly
                    placeholder="—"
                  />

                  <button type="button" aria-label="Отчество не редактируется">
                    ✎
                  </button>
                </div>
              </div>

              <p className="hint">
                Чтобы изменить имя или фамилию, нажмите на карандашик справа.
                После изменений нажмите «Сохранить изменения».
              </p>

              {authError ? <p className="profile-error">{authError}</p> : null}
              {successMessage ? (
                <p className="profile-success">{successMessage}</p>
              ) : null}

              <div className="save-zone">
                <button
                  type="submit"
                  className="save-profile-btn"
                  disabled={isLoading}
                >
                  {isLoading && !deleteModalOpen ? (
                    <Loader2 className="profile-btn-spin" size={18} aria-hidden />
                  ) : null}
                  Сохранить изменения
                </button>
              </div>

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
        </form>
      </section>
    </main>
  );
}
EOF

cat >> src/app/profile/page.css <<'EOF'

/* Pencil edit fix */
.profile-edit-input[readonly] {
  cursor: default;
  opacity: 0.92;
}

.profile-edit-input:not([readonly]) {
  cursor: text;
  color: #ffffff;
}

.info-card button {
  pointer-events: auto;
}

.info-card button:hover {
  background: rgba(139, 92, 246, 0.14);
}

.avatar-placeholder {
  display: grid;
  place-items: center;
  text-align: center;
  padding: 18px;
  color: #a7a7b4;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 700;
}
EOF

echo "DONE: profile pencil edit fixed"
