"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { AppNav } from "@/widgets/appShell/AppNav";
import {
  createClass,
  fetchClasses,
  joinClass,
  setClassPassword,
  updateClass,
  type ClassRoomItem,
} from "@/shared/lib/classesApi";
import { canManageClasses, isAdmin } from "@/shared/lib/permissions";
import { ClassJoinPasswordModal } from "@/features/classes/ui/ClassJoinPasswordModal";
import {
  ClassManageModal,
  type ClassManageModalMode,
} from "@/features/classes/ui/ClassManageModal";
import "./page.css";

function canEditClass(
  item: ClassRoomItem,
  userId: number | undefined,
  role?: string | null,
) {
  if (!userId) return false;
  if (role === "admin") return true;
  if (role === "teacher" && item.createdBy === userId) return true;
  return false;
}

export default function ClassesPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.user.user);
  const isInitialized = useAppSelector((state) => state.user.isInitialized);

  const [classes, setClasses] = useState<ClassRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ClassManageModalMode>("create");
  const [activeClass, setActiveClass] = useState<ClassRoomItem | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<ClassRoomItem | null>(null);
  const [joinSaving, setJoinSaving] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [enteringId, setEnteringId] = useState<number | null>(null);

  const userName = user?.name?.trim() || "Пользователь";
  const firstName = userName.split(/\s+/)[0] || "Пользователь";
  const avatarLetter = firstName.charAt(0).toUpperCase();
  const manageClasses = canManageClasses(user?.role);
  const showAdminLink = isAdmin(user?.role);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const list = await fetchClasses();
      setClasses(list);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Не удалось загрузить классы",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace(clientRoutes.home);
      return;
    }
    void loadClasses();
  }, [isInitialized, user, router, loadClasses]);

  const openCreate = () => {
    setActiveClass(null);
    setModalMode("create");
    setModalError(null);
    setModalOpen(true);
  };

  const openEdit = (item: ClassRoomItem) => {
    setActiveClass(item);
    setModalMode("edit");
    setModalError(null);
    setModalOpen(true);
  };

  const openPassword = (item: ClassRoomItem) => {
    setActiveClass(item);
    setModalMode("password");
    setModalError(null);
    setModalOpen(true);
  };

  const goToChat = useCallback(
    (classId: number) => {
      router.push(`${clientRoutes.chat}?classId=${classId}`);
    },
    [router],
  );

  const markJoinedLocally = useCallback((classId: number) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, isMember: true } : c)),
    );
  }, []);

  const handleEnterClass = async (classItem: ClassRoomItem) => {
    if (!user) return;

    const editable = canEditClass(classItem, user.id, user.role);

    if (editable || classItem.isMember) {
      setEnteringId(classItem.id);
      try {
        await joinClass(classItem.id);
        markJoinedLocally(classItem.id);
        goToChat(classItem.id);
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Не удалось войти в класс",
        );
      } finally {
        setEnteringId(null);
      }
      return;
    }

    if (!classItem.hasPassword) {
      setEnteringId(classItem.id);
      try {
        await joinClass(classItem.id);
        markJoinedLocally(classItem.id);
        goToChat(classItem.id);
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Не удалось войти в класс",
        );
      } finally {
        setEnteringId(null);
      }
      return;
    }

    setJoinTarget(classItem);
    setJoinError(null);
    setJoinModalOpen(true);
  };

  const handleJoinSubmit = async (password: string) => {
    if (!joinTarget) return;
    setJoinSaving(true);
    setJoinError(null);
    try {
      await joinClass(joinTarget.id, password);
      markJoinedLocally(joinTarget.id);
      setJoinModalOpen(false);
      setJoinTarget(null);
      goToChat(joinTarget.id);
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Неверный пароль",
      );
    } finally {
      setJoinSaving(false);
    }
  };

  const handleModalSubmit = async (payload: {
    title: string;
    description: string;
    joinPassword: string;
  }) => {
    setModalSaving(true);
    setModalError(null);
    try {
      if (modalMode === "create") {
        await createClass({
          title: payload.title,
          description: payload.description,
          joinPassword: payload.joinPassword || undefined,
        });
      } else if (modalMode === "edit" && activeClass) {
        await updateClass(activeClass.id, {
          title: payload.title,
          description: payload.description,
        });
      } else if (modalMode === "password" && activeClass) {
        await setClassPassword(activeClass.id, payload.joinPassword);
      }
      setModalOpen(false);
      await loadClasses();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Не удалось сохранить",
      );
    } finally {
      setModalSaving(false);
    }
  };

  if (!isInitialized || !user) {
    return (
      <main className="classes-page">
        <p className="classes-state">Загрузка…</p>
      </main>
    );
  }

  return (
    <main className="classes-page">
      <section className="classes-shell">
        <aside className="classes-sidebar">
          <div className="brand">
            <div className="brand-icon">
              <span>✦</span>
            </div>
            <span className="brand-name">EduChat</span>
          </div>

          <AppNav active="classes" showAdminLink={showAdminLink} />

          <div className="sidebar-info">
            <div className="shield-mini">🛡</div>
            <div>
              <h3>Безопасное обучение</h3>
              <p>
                {manageClasses
                  ? "Вы можете создавать классы и задавать пароль для входа."
                  : "Выберите класс для общения."}
              </p>
            </div>
          </div>
        </aside>

        <section className="classes-content">
          <header className="classes-header">
            <div>
              <h1>Добро пожаловать, {firstName}! 👋</h1>
              <p>Выберите класс, чтобы начать общение</p>
            </div>

            <div className="classes-profile-chip">
              <div className="classes-profile-avatar">{avatarLetter}</div>
              <div>
                <strong>{firstName}</strong>
                <span>Онлайн</span>
              </div>
            </div>
          </header>

          <div className="classes-top">
            <div>
              <h2>Ваши классы</h2>
              <p>Доступные учебные чаты</p>
            </div>

            {manageClasses ? (
              <button type="button" className="add-button" onClick={openCreate}>
                + Добавить класс
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="classes-state">
              <Loader2 size={20} className="classes-spin" /> Загрузка классов…
            </p>
          ) : null}

          {listError ? (
            <p className="classes-state classes-state--error" role="alert">
              {listError}
            </p>
          ) : null}

          {!loading && !listError ? (
            <div className="classes-grid">
              {classes.length === 0 ? (
                <p className="classes-state">Классов пока нет</p>
              ) : (
                classes.map((classItem) => {
                  const editable = canEditClass(
                    classItem,
                    user.id,
                    user.role,
                  );

                  const isEntering = enteringId === classItem.id;

                  return (
                    <article className="class-card" key={classItem.id}>
                      <div
                        className="class-card-main"
                        role="button"
                        tabIndex={0}
                        aria-disabled={isEntering}
                        onClick={() => {
                          if (!isEntering) void handleEnterClass(classItem);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!isEntering) void handleEnterClass(classItem);
                          }
                        }}
                      >
                        <div className={`class-icon ${classItem.color}`}>
                          <svg
                            width="30"
                            height="30"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 5.5C4 4.67 4.67 4 5.5 4H9C10.66 4 12 5.34 12 7V20C12 18.34 10.66 17 9 17H5.5C4.67 17 4 16.33 4 15.5V5.5Z"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M20 5.5C20 4.67 19.33 4 18.5 4H15C13.34 4 12 5.34 12 7V20C12 18.34 13.34 17 15 17H18.5C19.33 17 20 16.33 20 15.5V5.5Z"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <div className="class-info">
                          <h3>{classItem.title}</h3>
                          <p>
                            {classItem.description || "Учебный чат класса"}
                          </p>
                          <span>Участников: {classItem.memberCount}</span>
                        </div>

                        <div className="class-meta">
                          <div className="password-label">
                            <span>🔒</span>
                            {classItem.hasPassword
                              ? "Требуется пароль"
                              : "Без пароля"}
                          </div>
                          <span className="arrow">
                            {isEntering ? "…" : "›"}
                          </span>
                        </div>
                      </div>

                      {editable ? (
                        <div className="class-card-actions">
                          <button
                            type="button"
                            className="class-action-btn"
                            onClick={() => openEdit(classItem)}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="class-action-btn"
                            onClick={() => openPassword(classItem)}
                          >
                            Пароль
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          ) : null}
        </section>
      </section>

      <ClassManageModal
        open={modalOpen}
        mode={modalMode}
        initialTitle={activeClass?.title ?? ""}
        initialDescription={activeClass?.description ?? ""}
        saving={modalSaving}
        error={modalError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />

      <ClassJoinPasswordModal
        open={joinModalOpen}
        classTitle={joinTarget?.title ?? ""}
        saving={joinSaving}
        error={joinError}
        onClose={() => {
          setJoinModalOpen(false);
          setJoinTarget(null);
          setJoinError(null);
        }}
        onSubmit={handleJoinSubmit}
      />
    </main>
  );
}
