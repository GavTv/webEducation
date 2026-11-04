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
import { authPath, clientRoutes } from "@/shared/consts/clientRoutes";
import {
  Calendar,
  Camera,
  CheckCircle2,
  Loader2,
  LogOut,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import {
  deleteAccountThunk,
  logoutThunk,
  updateProfileThunk,
} from "@/entities/user/api/UserApiThunk";
import { setError } from "@/entities/user/slice/userSlice";
import { ConfirmModal } from "@/shared/ui/ConfirmModal/ConfirmModal";
import { AppBackButton } from "@/widgets/appShell/AppBackButton";
import { AppNav } from "@/widgets/appShell/AppNav";
import { BrandLogo } from "@/widgets/appShell/BrandLogo";
import { MobileBottomNav } from "@/widgets/appShell/MobileBottomNav";
import { isAdmin } from "@/shared/lib/permissions";
import { useAutoDismiss } from "@/shared/hooks/useAutoDismiss";
import { FadeAlert } from "@/shared/ui/FadeAlert/FadeAlert";
import { formatPlatformSince } from "@/shared/lib/formatPlatformSince";
import { getAvatarSrc } from "@/shared/lib/getAvatarSrc";
import { getNameInitials } from "@/shared/lib/getNameInitials";
import { sendBotAiMessage } from "@/shared/lib/botAiApi";
import "../classes/page.css";
import "./page.css";

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const firstNameInputRef = useRef<HTMLInputElement | null>(null);
  const lastNameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  const user = useAppSelector((s) => s.user.user);
  const isInitialized = useAppSelector((s) => s.user.isInitialized);
  const isLoading = useAppSelector((s) => s.user.isLoading);
  const authError = useAppSelector((s) => s.user.error);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [profileFacts, setProfileFacts] = useState("");
  const [profileAiOpen, setProfileAiOpen] = useState(false);
  const [profileAiLoading, setProfileAiLoading] = useState(false);
  const [profileAiError, setProfileAiError] = useState("");

  const [isFirstNameEditable, setIsFirstNameEditable] = useState(false);
  const [isLastNameEditable, setIsLastNameEditable] = useState(false);
  const [isPhoneEditable, setIsPhoneEditable] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    if (user) {
      setAuthChecked(true);
      return;
    }

    router.replace(authPath("login"));
  }, [isInitialized, router, user]);

  useEffect(() => {
    if (user) {
      const parsedName = splitName(user.name);

      setFirstName(parsedName.firstName);
      setLastName(parsedName.lastName);
      setPhone(user.phone?.trim() ?? "");
      setBio(user.bio?.trim() ?? "");

      setIsFirstNameEditable(false);
      setIsLastNameEditable(false);
      setIsPhoneEditable(false);

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
    return [firstName, lastName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
  }, [firstName, lastName]);

  const avatarInitials = useMemo(
    () => getNameInitials(firstName, lastName, user?.name),
    [firstName, lastName, user?.name],
  );

  const platformSince = useMemo(
    () => formatPlatformSince(user?.createdAt),
    [user?.createdAt],
  );

  const showAdminLink = isAdmin(user?.role);
  const profileItems = [
    { label: "Аватар", complete: Boolean(user?.avatarUrl || avatarFile) },
    { label: "Описание", complete: Boolean(bio.trim()) },
    { label: "Телефон", complete: Boolean(phone.trim()) },
  ];
  const completedProfileItems = profileItems.filter((item) => item.complete).length;

  useAutoDismiss(Boolean(successMessage), () => {
    setSuccessMessage("");
  });

  const focusFieldEnd = useCallback((input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    const end = input.value.length;
    input.focus();
    input.setSelectionRange(end, end);
  }, []);

  const enableFirstNameEdit = useCallback(() => {
    if (isFirstNameEditable) {
      return;
    }
    setIsFirstNameEditable(true);
    setTimeout(() => focusFieldEnd(firstNameInputRef.current), 0);
  }, [focusFieldEnd, isFirstNameEditable]);

  const enableLastNameEdit = useCallback(() => {
    if (isLastNameEditable) {
      return;
    }
    setIsLastNameEditable(true);
    setTimeout(() => focusFieldEnd(lastNameInputRef.current), 0);
  }, [focusFieldEnd, isLastNameEditable]);

  const enablePhoneEdit = useCallback(() => {
    if (isPhoneEditable) {
      return;
    }
    setIsPhoneEditable(true);
    setTimeout(() => focusFieldEnd(phoneInputRef.current), 0);
  }, [focusFieldEnd, isPhoneEditable]);

  const handleLogout = useCallback(() => {
    dispatch(logoutThunk())
      .unwrap()
      .then(() => {
        router.push(authPath("login"));
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
        router.push(authPath("login"));
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

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setSuccessMessage("");
      dispatch(setError(null));

      if (fullName.trim().length < 2) {
        dispatch(setError("Укажите имя и фамилию (минимум 2 символа)"));
        return;
      }

      const phoneTrimmed = phone.trim();
      if (phoneTrimmed) {
        const digits = phoneTrimmed.replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) {
          dispatch(setError("Телефон должен содержать от 10 до 15 цифр"));
          return;
        }
      }

      dispatch(
        updateProfileThunk({
          name: fullName,
          phone: phoneTrimmed,
          bio: bio.trim(),
          avatar: avatarFile,
        }),
      )
        .unwrap()
        .then(() => {
          setAvatarFile(null);
          setAvatarPreview("");
          setIsFirstNameEditable(false);
          setIsLastNameEditable(false);
          setIsPhoneEditable(false);
          setSuccessMessage("Профиль сохранён");
        })
        .catch(() => {});
    },
    [avatarFile, bio, dispatch, fullName, phone],
  );

  const generateProfileBio = useCallback(async () => {
    const facts = profileFacts.trim();
    if (!facts || profileAiLoading) return;

    setProfileAiLoading(true);
    setProfileAiError("");
    try {
      const response = await sendBotAiMessage(
        `Составь краткое описание для профиля пользователя ${fullName || user?.name || ""}. Используй только эти факты: ${facts}. Максимум 500 символов.`,
        "profile",
      );

      if (response.error) {
        setProfileAiError(response.answer);
        return;
      }

      setBio(response.answer.slice(0, 500));
      setProfileAiOpen(false);
      setSuccessMessage("Черновик добавлен. Проверьте его и сохраните профиль.");
    } catch {
      setProfileAiError("Не удалось подготовить описание. Попробуйте ещё раз.");
    } finally {
      setProfileAiLoading(false);
    }
  }, [fullName, profileAiLoading, profileFacts, user?.name]);

  if (!isInitialized || !authChecked || !user) {
    return (
      <main className="classes-page app-page profile-page app-page--with-tabbar">
        <p className="profile-state">Загрузка…</p>
      </main>
    );
  }

  return (
    <main className="classes-page app-page profile-page app-page--with-tabbar">
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

      <section className="profile-shell classes-shell app-shell">
        <aside className="profile-sidebar classes-sidebar app-sidebar">
          <BrandLogo />

          <AppNav active="profile" showAdminLink={showAdminLink} />

          <div className="sidebar-info">
            <div className="shield-mini">🛡</div>
            <div>
              <h3>Настройки профиля</h3>
              <p>Измените личные данные и фото.</p>
            </div>
          </div>
        </aside>

        <section className="profile-main classes-content app-content">
          <header className="profile-page-header app-content-header">
            <AppBackButton
              href={clientRoutes.chat}
              className="app-header__back"
            />
            <button
              type="button"
              className="app-header-action-btn profile-logout-btn"
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading && !deleteModalOpen ? (
                <Loader2 className="profile-btn-spin" size={18} aria-hidden />
              ) : (
                <LogOut size={18} aria-hidden />
              )}
              Выйти
            </button>
          </header>

          <form className="profile-form" onSubmit={handleSubmit}>
            <section className="profile-hero">
              <label className="profile-avatar">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" />
                ) : (
                  <span className="profile-avatar-initials" aria-hidden>
                    {avatarInitials}
                  </span>
                )}

                <input
                  className="profile-avatar-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarChange}
                />

                <span className="profile-avatar-camera" aria-hidden>
                  <Camera size={18} strokeWidth={2} />
                </span>
              </label>

              <div className="profile-hero-text">
                <div className="profile-name-row">
                  <h2>{fullName || user.name}</h2>
                </div>
                <p className="profile-username">@{user.username}</p>
                {platformSince ? (
                  <p className="profile-member-since">
                    <Calendar size={16} strokeWidth={2} aria-hidden />
                    {platformSince}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="profile-section">
              <h3>Личная информация</h3>

              <div className="profile-fields">
                <div className="profile-field">
                  <span className="profile-field-label">Имя</span>
                  <input
                    ref={firstNameInputRef}
                    className="profile-field-input"
                    value={firstName}
                    readOnly={!isFirstNameEditable}
                    onClick={enableFirstNameEdit}
                    onFocus={enableFirstNameEdit}
                    onChange={(event) => {
                      setFirstName(event.target.value);
                      setSuccessMessage("");
                    }}
                    onBlur={() => setIsFirstNameEditable(false)}
                    placeholder="Имя"
                    aria-label="Имя"
                  />
                </div>

                <div className="profile-field">
                  <span className="profile-field-label">Фамилия</span>
                  <input
                    ref={lastNameInputRef}
                    className="profile-field-input"
                    value={lastName}
                    readOnly={!isLastNameEditable}
                    onClick={enableLastNameEdit}
                    onFocus={enableLastNameEdit}
                    onChange={(event) => {
                      setLastName(event.target.value);
                      setSuccessMessage("");
                    }}
                    onBlur={() => setIsLastNameEditable(false)}
                    placeholder="Фамилия"
                    aria-label="Фамилия"
                  />
                </div>

                <div className="profile-field">
                  <span className="profile-field-label">Email</span>
                  <input
                    className="profile-field-input profile-field-input--readonly"
                    value={user.email}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div className="profile-field">
                  <span className="profile-field-label">
                    Телефон (необязательно)
                  </span>
                  <input
                    ref={phoneInputRef}
                    className="profile-field-input"
                    type="tel"
                    value={
                      !isPhoneEditable && !phone.trim()
                        ? "Не указано"
                        : phone
                    }
                    readOnly={!isPhoneEditable}
                    onClick={enablePhoneEdit}
                    onFocus={enablePhoneEdit}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setSuccessMessage("");
                    }}
                    onBlur={() => setIsPhoneEditable(false)}
                    placeholder="+7 900 000-00-00"
                    autoComplete="tel"
                    aria-label="Телефон"
                  />
                </div>

                <div className="profile-field profile-field--wide">
                  <label className="profile-field-label" htmlFor="profile-bio">
                    О себе (необязательно)
                  </label>
                  <textarea
                    id="profile-bio"
                    className="profile-field-input profile-bio-input"
                    value={bio}
                    onChange={(event) => {
                      setBio(event.target.value.slice(0, 500));
                      setSuccessMessage("");
                    }}
                    maxLength={500}
                    placeholder="Коротко расскажите, чем занимаетесь или что изучаете"
                  />
                  <span className="profile-bio-counter">{bio.length}/500</span>
                  {profileAiOpen ? (
                    <div className="profile-ai-compose">
                      <label htmlFor="profile-ai-facts">
                        Какие факты включить в описание?
                      </label>
                      <textarea
                        id="profile-ai-facts"
                        value={profileFacts}
                        onChange={(event) => setProfileFacts(event.target.value)}
                        maxLength={700}
                        placeholder="Например: изучаю frontend, интересуюсь React, ищу командный проект"
                      />
                      {profileAiError ? (
                        <p className="profile-ai-error" role="alert">
                          {profileAiError}
                        </p>
                      ) : null}
                      <div className="profile-ai-compose-actions">
                        <button
                          type="button"
                          className="profile-ai-secondary-btn"
                          onClick={() => setProfileAiOpen(false)}
                          disabled={profileAiLoading}
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          className="profile-ai-primary-btn"
                          onClick={generateProfileBio}
                          disabled={!profileFacts.trim() || profileAiLoading}
                        >
                          {profileAiLoading ? (
                            <Loader2
                              size={16}
                              className="profile-btn-spin"
                              aria-hidden
                            />
                          ) : (
                            <Sparkles size={16} aria-hidden />
                          )}
                          {profileAiLoading ? "Готовим…" : "Составить черновик"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="profile-ai-generate-btn"
                      onClick={() => {
                        setProfileAiError("");
                        setProfileAiOpen(true);
                      }}
                    >
                      <Sparkles size={16} aria-hidden />
                      Помочь составить описание
                    </button>
                  )}
                </div>
              </div>

              <FadeAlert text={authError} className="profile-error" />
              <FadeAlert
                text={successMessage || null}
                className="profile-success"
                role="status"
              />

              <div className="profile-save-row">
                <button
                  type="submit"
                  className="profile-save-btn"
                  disabled={isLoading}
                >
                  {isLoading && !deleteModalOpen ? (
                    <Loader2 className="profile-btn-spin" size={18} aria-hidden />
                  ) : null}
                  Сохранить изменения
                </button>
              </div>
            </section>
          </form>

          <section className="profile-helper" aria-labelledby="profile-helper-title">
            <div className="profile-helper-heading">
              <div className="profile-helper-icon">
                <CheckCircle2 size={20} aria-hidden />
              </div>
              <div>
                <h2 id="profile-helper-title">Проверка профиля</h2>
                <p>
                  Заполнено {completedProfileItems} из {profileItems.length}{" "}
                  рекомендуемых пунктов
                </p>
              </div>
            </div>
            <div className="profile-helper-checklist">
              {profileItems.map((item) => (
                <span
                  className={item.complete ? "is-complete" : ""}
                  key={item.label}
                >
                  <CheckCircle2 size={16} aria-hidden />
                  {item.label}
                </span>
              ))}
            </div>
            <p className="profile-helper-note">
              Описание создаётся как черновик. Проверьте его и нажмите
              «Сохранить изменения».
            </p>
          </section>

          {!showAdminLink ? (
            <div className="profile-delete-row">
              <button
                type="button"
                className="profile-delete-btn"
                onClick={handleOpenDelete}
                disabled={isLoading}
              >
                <Trash2 size={18} aria-hidden />
                Удалить аккаунт
              </button>
            </div>
          ) : null}
        </section>
      </section>

      <MobileBottomNav active="profile" showAdminLink={showAdminLink} />
    </main>
  );
}
