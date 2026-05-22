"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { authPath, clientRoutes } from "@/shared/consts/clientRoutes";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import type { UserRole } from "@/entities/user/model";
import {
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUserRole,
  type AdminUserListItem,
} from "@/shared/lib/adminUsersApi";
import { ROLE_OPTIONS } from "@/shared/lib/roleLabels";
import { ConfirmModal } from "@/shared/ui/ConfirmModal/ConfirmModal";
import { AppBackButton } from "@/widgets/appShell/AppBackButton";
import { AppNav } from "@/widgets/appShell/AppNav";
import { BrandLogo } from "@/widgets/appShell/BrandLogo";
import { MobileBottomNav } from "@/widgets/appShell/MobileBottomNav";
import { isAdmin } from "@/shared/lib/permissions";
import "../classes/page.css";
import "./page.css";

function formatRegisteredAt(value?: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.user.user);
  const isInitialized = useAppSelector((s) => s.user.isInitialized);

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserListItem | null>(
    null,
  );
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminUsers();
      setUsers(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить список",
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
    if (user.role !== "admin") {
      router.replace(clientRoutes.classes);
      return;
    }
    void loadUsers();
  }, [isInitialized, user, router, loadUsers]);

  const isAdminUser = user?.role === "admin";
  const showAdminLink = isAdmin(user?.role);

  const handleRoleChange = async (userId: number, role: UserRole) => {
    setSavingUserId(userId);
    setRoleError(null);
    try {
      const updated = await updateAdminUserRole(userId, role);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)),
      );
    } catch (err) {
      setRoleError(
        err instanceof Error ? err.message : "Не удалось сменить роль",
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const handleOpenDelete = (row: AdminUserListItem) => {
    setDeleteError(null);
    setUserToDelete(row);
  };

  const handleCloseDelete = () => {
    if (deletingUserId !== null) return;
    setDeleteError(null);
    setUserToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeletingUserId(userToDelete.id);
    setDeleteError(null);
    try {
      await deleteAdminUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Не удалось удалить пользователя",
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!isInitialized || !user) {
    return (
      <main className="admin-page">
        <p className="admin-state">Загрузка…</p>
      </main>
    );
  }

  if (!isAdminUser) {
    return null;
  }

  return (
    <main className="admin-page app-page app-page--with-tabbar">
      {userToDelete ? (
        <ConfirmModal
          title="Удалить пользователя?"
          lines={[
            `Аккаунт ${userToDelete.name} (${userToDelete.email}) будет удалён безвозвратно.`,
          ]}
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          onConfirm={() => void handleConfirmDelete()}
          onCancel={handleCloseDelete}
          isBusy={deletingUserId !== null}
          errorMessage={deleteError}
        />
      ) : null}

      <section className="admin-shell classes-shell app-shell">
        <aside className="admin-sidebar classes-sidebar app-sidebar">
          <BrandLogo />

          <AppNav active="admin" showAdminLink={showAdminLink} />

          <div className="sidebar-info">
            <div className="shield-mini">🛡</div>
            <div>
              <h3>Администрирование</h3>
              <p>Управление пользователями платформы.</p>
            </div>
          </div>
        </aside>

        <section className="admin-content classes-content app-content">
          <header className="admin-header app-content-header">
            <AppBackButton
              href={clientRoutes.classes}
              className="app-header__back"
            />
            <h1 className="admin-header__title">Аккаунты</h1>
          </header>

          {loading ? (
            <p className="admin-state">
              <Loader2 className="spin" size={22} /> Загрузка списка…
            </p>
          ) : null}

          {error ? (
            <p className="admin-state admin-state--error" role="alert">
              {error}
            </p>
          ) : null}

          {roleError ? (
            <p className="admin-state admin-state--error" role="alert">
              {roleError}
            </p>
          ) : null}

          {!loading && !error ? (
            <>
            <ul className="admin-user-cards" aria-label="Список пользователей">
              {users.length === 0 ? (
                <li className="admin-user-cards__empty">Пользователей пока нет</li>
              ) : (
                users.map((row) => (
                  <li key={row.id} className="admin-user-card">
                    <div className="admin-user-card__head">
                      <div className="admin-user-card__identity">
                        <span className="admin-user-card__name">{row.name}</span>
                        <span className="admin-user-card__email">{row.email}</span>
                        <span className="admin-user-card__username">
                          @{row.username}
                        </span>
                      </div>
                      {row.isProtected ? (
                        <span
                          className="admin-user-protected"
                          title="Системный администратор"
                        >
                          —
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="admin-user-delete"
                          aria-label={`Удалить ${row.name}`}
                          disabled={
                            row.id === user.id ||
                            savingUserId === row.id ||
                            deletingUserId === row.id
                          }
                          onClick={() => handleOpenDelete(row)}
                        >
                          {deletingUserId === row.id ? (
                            <Loader2 className="spin" size={14} />
                          ) : (
                            <X size={14} strokeWidth={2} />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="admin-user-card__foot">
                      <label className="sr-only" htmlFor={`role-m-${row.id}`}>
                        Роль для {row.name}
                      </label>
                      <select
                        id={`role-m-${row.id}`}
                        className="role-select role-select--compact"
                        value={row.role ?? "student"}
                        disabled={
                          savingUserId === row.id || row.isProtected === true
                        }
                        onChange={(e) =>
                          void handleRoleChange(
                            row.id,
                            e.target.value as UserRole,
                          )
                        }
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <time
                        className="admin-user-card__date"
                        dateTime={row.createdAt}
                      >
                        {formatRegisteredAt(row.createdAt)}
                      </time>
                    </div>
                    {savingUserId === row.id ? (
                      <span className="role-saving">Сохранение…</span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Текущая роль</th>
                    <th>Дата регистрации</th>
                    <th className="admin-table__actions-col" aria-label="Действия" />
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Пользователей пока нет</td>
                    </tr>
                  ) : (
                    users.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>@{row.username}</td>
                        <td>
                          <label className="sr-only" htmlFor={`role-${row.id}`}>
                            Роль для {row.name}
                          </label>
                          <select
                            id={`role-${row.id}`}
                            className="role-select"
                            value={row.role ?? "student"}
                            disabled={
                              savingUserId === row.id || row.isProtected === true
                            }
                            onChange={(e) =>
                              void handleRoleChange(
                                row.id,
                                e.target.value as UserRole,
                              )
                            }
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {savingUserId === row.id ? (
                            <span className="role-saving">Сохранение…</span>
                          ) : null}
                        </td>
                        <td>{formatRegisteredAt(row.createdAt)}</td>
                        <td className="admin-table__actions-cell">
                          {row.isProtected ? (
                            <span
                              className="admin-user-protected"
                              title="Системный администратор"
                            >
                              —
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="admin-user-delete"
                              aria-label={`Удалить ${row.name}`}
                              disabled={
                                row.id === user.id ||
                                savingUserId === row.id ||
                                deletingUserId === row.id
                              }
                              onClick={() => handleOpenDelete(row)}
                            >
                              {deletingUserId === row.id ? (
                                <Loader2 className="spin" size={18} />
                              ) : (
                                <X size={18} strokeWidth={2} />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </>
          ) : null}
        </section>
      </section>

      <MobileBottomNav active="admin" showAdminLink={showAdminLink} />
    </main>
  );
}
