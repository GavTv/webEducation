export function getNameInitials(
  firstName: string,
  lastName: string,
  fallbackFullName?: string,
): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);

  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }

  const parts = (fallbackFullName ?? "").trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  if (parts[0]) {
    return parts[0].charAt(0).toUpperCase();
  }

  return "?";
}
