import { NextResponse } from "next/server";

/**
 * @deprecated @botAi вызывает POST /api/ai/chat на Express (GEMINI_API_KEY в server/.env / Render).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "AI_ROUTE_MOVED",
      answer:
        "AI перенесён на бэкенд. Обнови клиент и задай GEMINI_API_KEY на сервере (Render).",
    },
    { status: 410 },
  );
}
