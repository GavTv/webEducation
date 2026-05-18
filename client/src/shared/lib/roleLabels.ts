import type { UserRole } from "@/entities/user/model";

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "student", label: "Ученик" },
  { value: "teacher", label: "Учитель" },
  { value: "admin", label: "Администратор" },
];

const ROLE_LABELS: Record<UserRole, string> = {
  student: "Ученик",
  teacher: "Учитель",
  admin: "Администратор",
};

export function getRoleLabel(role?: string | null): string {
  if (!role) return "Ученик";
  return ROLE_LABELS[role as UserRole] ?? role;
}
