const LOCAL_API_ORIGIN = "http://localhost:3000";
const RENDER_API_ORIGIN = "https://webeducation.onrender.com";

/** Origin API без `/api`. Старый хост Amvera больше не используется. */
export function getApiOrigin(): string {
  let raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  raw = raw.replace(/\/+$/, "").replace(/\/api$/i, "");

  if (/amvera\.io/i.test(raw)) {
    return RENDER_API_ORIGIN;
  }

  if (raw) return raw;

  return process.env.NODE_ENV === "production"
    ? RENDER_API_ORIGIN
    : LOCAL_API_ORIGIN;
}

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api/`;
}
