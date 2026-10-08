import { getApiOrigin } from "@/shared/lib/apiOrigin";

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
