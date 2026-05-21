"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  Loader2,
  Lock,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { authPath, clientRoutes } from "@/shared/consts/clientRoutes";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { AppNav } from "@/widgets/appShell/AppNav";
import { AppProfileChip } from "@/widgets/appShell/AppProfileChip";
import { BrandLogo } from "@/widgets/appShell/BrandLogo";
import { MobileBottomNav } from "@/widgets/appShell/MobileBottomNav";
import {
  createClass,
  deleteClass,
  fetchClasses,
  joinClass,
  setClassPassword,
  updateClass,
  type ClassRoomItem,
} from "@/shared/lib/classesApi";
import { getAvatarSrc } from "@/shared/lib/getAvatarSrc";
import { getNameInitials } from "@/shared/lib/getNameInitials";
import { canManageClasses, isAdmin } from "@/shared/lib/permissions";
import { ClassJoinPasswordModal } from "@/features/classes/ui/ClassJoinPasswordModal";
import {
  ClassManageModal,
  type ClassManageModalMode,
} from "@/features/classes/ui/ClassManageModal";
import { ConfirmModal } from "@/shared/ui/ConfirmModal/ConfirmModal";
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

  const [deleteTarget, setDeleteTarget] = useState<ClassRoomItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<ClassRoomItem | null>(null);
  const [joinSaving, setJoinSaving] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [enteringId, setEnteringId] = useState<number | null>(null);

  const userName = user?.name?.trim() || "";
  const nameParts = userName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Пользователь";
  const lastName = nameParts[1] || "";
  const avatarInitials = getNameInitials(firstName, lastName, user?.name);
  const avatarSrc = getAvatarSrc(user?.avatarUrl);
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
      router.replace(authPath("login"));
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

  const openDelete = (item: ClassRoomItem) => {
    setDeleteTarget(item);
    setDeleteError(null);
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
      setJoinError(err instanceof Error ? err.message : "Неверный пароль");
    } finally {
      setJoinSaving(false);
    }
  };

  const handleModalSubmit = async (payload: {
    title: string;
    description: string;
    joinPassword: string;
    clearPassword?: boolean;
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
        if (payload.clearPassword) {
          await setClassPassword(activeClass.id, "");
        } else if (payload.joinPassword.trim()) {
          await setClassPassword(activeClass.id, payload.joinPassword);
        }
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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await deleteClass(deleteTarget.id);
      setDeleteTarget(null);
      await loadClasses();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Не удалось удалить класс",
      );
    } finally {
      setDeleteSaving(false);
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
    <main className="classes-page app-page app-page--with-tabbar">
      <section className="classes-shell app-shell">
        <aside className="classes-sidebar app-sidebar">
          <BrandLogo />

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

        <section className="classes-content app-content">
          <header className="classes-header app-content-header">
            <div>
              <h1>
                <span className="app-heading-mobile">Классы</span>
                <span className="app-heading-desktop">
                  Добро пожаловать, {firstName}! 👋
                </span>
              </h1>
              <p className="app-header-subtitle">
                Выберите класс, чтобы начать общение
              </p>
            </div>

            <AppProfileChip
              firstName={firstName}
              avatarSrc={avatarSrc}
              avatarInitials={avatarInitials}
              interactive={false}
              ariaLabel={`${firstName}, онлайн`}
            />
          </header>

          <div className="classes-top">
            <div className="classes-top__headings">
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
            <div className="classes-list">
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
                          <BookOpen size={30} strokeWidth={1.8} aria-hidden />
                        </div>

                        <div className="class-info">
                          <h3>{classItem.title}</h3>
                          <p>
                            {classItem.description || "Учебный чат класса"}
                          </p>
                          <span className="class-members">
                            <Users size={15} strokeWidth={2} aria-hidden />
                            Участников: {classItem.memberCount}
                          </span>
                        </div>

                        <div className="class-meta">
                          {classItem.hasPassword ? (
                            <span className="class-password-hint">
                              <Lock
                                size={16}
                                strokeWidth={2.2}
                                className="class-lock-icon"
                                aria-hidden
                              />
                              Требуется пароль
                            </span>
                          ) : null}
                          <ChevronRight
                            size={22}
                            className="class-chevron"
                            aria-hidden
                          />
                        </div>
                      </div>

                      {editable ? (
                        <div className="class-card-actions">
                          <button
                            type="button"
                            className="class-btn class-btn--edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(classItem);
                            }}
                          >
                            <Pencil size={16} strokeWidth={2} aria-hidden />
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="class-btn class-btn--delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDelete(classItem);
                            }}
                          >
                            <Trash2 size={16} strokeWidth={2} aria-hidden />
                            Удалить
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

      {deleteTarget ? (
        <ConfirmModal
          title={`Удалить класс «${deleteTarget.title}»?`}
          lines={[
            "Чат класса и все участники будут удалены без возможности восстановления.",
          ]}
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            if (!deleteSaving) setDeleteTarget(null);
          }}
          isBusy={deleteSaving}
          errorMessage={deleteError}
        />
      ) : null}

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

      <MobileBottomNav active="classes" showAdminLink={showAdminLink} />
    </main>
  );
}
