export function getApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
}

export function getAvatarSrc(
  avatarUrl?: string | null,
  cacheBust?: string | number | null,
) {
  if (!avatarUrl) {
    return "";
  }

  let url = avatarUrl;

  if (!url.startsWith("http")) {
    url = `${getApiOrigin()}${url}`;
  }

  if (cacheBust == null || cacheBust === "") {
    return url;
  }

  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(String(cacheBust))}`;
}
