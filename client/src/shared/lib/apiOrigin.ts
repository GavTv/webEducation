const LOCAL_API_ORIGIN = "http://localhost:3000";
const RENDER_API_ORIGIN = "https://webeducation.onrender.com";

/** Origin API без `/api`. На сайте всегда Render, локально — localhost. */
export function getApiOrigin(): string {
  if (process.env.NODE_ENV === "production") {
    return RENDER_API_ORIGIN;
  }

  let raw = (process.env.NEXT_PUBLIC_API_URL ?? LOCAL_API_ORIGIN).trim();
  raw = raw.replace(/\/+$/, "").replace(/\/api$/i, "");
  return raw || LOCAL_API_ORIGIN;
}

export function getApiBaseUrl(): string {
  if (process.env.NODE_ENV === "production") {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/backend/`;
    }
    return `${RENDER_API_ORIGIN}/api/`;
  }

  return `${getApiOrigin()}/api/`;
}
