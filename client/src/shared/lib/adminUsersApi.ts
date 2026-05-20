import { axiosInstance } from "@/shared/lib/axiosInstance";
import type { UserRole, UserType } from "@/entities/user/model";
import type { ServerResponseType } from "@/shared/types";

export type AdminUserListItem = Pick<
  UserType,
  "id" | "name" | "email" | "username" | "role" | "createdAt"
>;

export async function fetchAdminUsers(): Promise<AdminUserListItem[]> {
  const { data } = await axiosInstance.get<
    ServerResponseType<{ users: AdminUserListItem[] }>
  >("admin/users");

  if (data.statusCode !== 200 || !data.data?.users) {
    throw new Error(data.message ?? "Не удалось загрузить пользователей");
  }

  return data.data.users;
}

export async function updateAdminUserRole(
  userId: number,
  role: UserRole,
): Promise<AdminUserListItem> {
  const { data } = await axiosInstance.patch<
    ServerResponseType<{ user: AdminUserListItem }>
  >(`admin/users/${userId}/role`, { role });

  if (data.statusCode !== 200 || !data.data?.user) {
    throw new Error(data.message ?? "Не удалось обновить роль");
  }

  return data.data.user;
}

export async function deleteAdminUser(userId: number): Promise<void> {
  const { data } = await axiosInstance.delete<ServerResponseType<null>>(
    `admin/users/${userId}`,
  );

  if (data.statusCode !== 200) {
    throw new Error(data.message ?? "Не удалось удалить пользователя");
  }
}
