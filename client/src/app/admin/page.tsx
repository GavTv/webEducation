"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { AppNav } from "@/widgets/appShell/AppNav";
import { BrandLogo } from "@/widgets/appShell/BrandLogo";
import { MobileBottomNav } from "@/widgets/appShell/MobileBottomNav";
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

  const isAdmin = user?.role === "admin";

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

  if (!isAdmin) {
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

          <AppNav active="admin" showAdminLink />

          <div className="sidebar-info">
            <div className="shield-mini">🛡</div>
            <div>
              <h3>Администрирование</h3>
              <p>Управление пользователями платформы.</p>
            </div>
          </div>
        </aside>

        <section className="admin-content classes-content app-content">
          <header className="admin-header classes-header app-content-header">
            <div>
              <p className="eyebrow">Панель администратора</p>
              <h1>Управление пользователями</h1>
            </div>
            <Link className="nav-link" href={clientRoutes.classes}>
              ← К классам
            </Link>
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
                            disabled={savingUserId === row.id}
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>

      <MobileBottomNav active="admin" showAdminLink />
    </main>
  );
}
