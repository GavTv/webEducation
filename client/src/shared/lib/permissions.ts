import type { UserRole } from "@/entities/user/model";

export function canManageClasses(role?: UserRole | string | null): boolean {
  return role === "teacher" || role === "admin";
}

export function isAdmin(role?: UserRole | string | null): boolean {
  return role === "admin";
}
