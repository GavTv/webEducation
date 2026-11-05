import type { UserRole } from "@/entities/user/model";

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "student", label: "Ученик" },
  { value: "teacher", label: "Учитель" },
  { value: "admin", label: "Администратор" },
];

