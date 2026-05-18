/** «На платформе с май 2024» */
export function formatPlatformSince(createdAt?: string | null): string | null {
  if (!createdAt) {
    return null;
  }

  try {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const month = date.toLocaleDateString("ru-RU", { month: "long" });
    const year = date.getFullYear();

    return `На платформе с ${month} ${year}`;
  } catch {
    return null;
  }
}
