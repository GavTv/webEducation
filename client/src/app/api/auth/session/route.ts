/**
 * Явный маршрут для /api/auth/session — fallback, если catch-all не срабатывает (Next 16 / Turbopack).
 */
import { handlers } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handlers.GET;
export const POST = handlers.POST;
