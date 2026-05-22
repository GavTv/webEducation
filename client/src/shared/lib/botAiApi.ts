import axios from "axios";
import { axiosInstance } from "@/shared/lib/axiosInstance";
import { extractApiMessage } from "@/shared/lib/extractApiMessage";

export type BotAiResponse = {
  answer: string;
  error?: string;
  used?: number;
  limit?: number;
};

function parseBotAiPayload(data: unknown): BotAiResponse | null {
  if (!data || typeof data !== "object") return null;

  const body = data as Record<string, unknown>;

  if (typeof body.answer === "string") {
    return {
      answer: body.answer,
      error: typeof body.error === "string" ? body.error : undefined,
      used: typeof body.used === "number" ? body.used : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    };
  }

  if (typeof body.message === "string" && body.message.trim()) {
    return {
      answer: body.message,
      error: body.error === true ? "API_ERROR" : undefined,
    };
  }

  return null;
}

export async function sendBotAiMessage(message: string): Promise<BotAiResponse> {
  try {
    const { data } = await axiosInstance.post("ai/chat", { message });
    const parsed = parseBotAiPayload(data);

    if (parsed) {
      return parsed;
    }

    return {
      answer: "Неожиданный ответ сервера AI.",
      error: "INVALID_RESPONSE",
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const parsed = parseBotAiPayload(error.response?.data);
      if (parsed) {
        return parsed;
      }

      if (error.response?.status === 404) {
        return {
          answer:
            "Маршрут AI не найден на сервере. Задеплой последнюю версию backend (Render) с /api/ai/chat.",
          error: "NOT_FOUND",
        };
      }

      if (!error.response) {
        return {
          answer:
            "Не удалось связаться с API. Проверь NEXT_PUBLIC_API_URL и что сервер запущен.",
          error: "NETWORK",
        };
      }
    }

    return {
      answer: extractApiMessage(
        error,
        "Сейчас AI недоступен. Попробуй позже.",
      ),
      error: "REQUEST_FAILED",
    };
  }
}
