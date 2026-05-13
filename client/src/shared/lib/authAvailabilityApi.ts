import { axiosInstance } from "@/shared/lib/axiosInstance";
import type { ServerResponseType } from "@/shared/types";
import { AxiosError } from "axios";

export type AvailabilityPayload = {
  formatOk: boolean;
  available: boolean | null;
  message: string | null;
};

function networkFallback(): string {
  return "Не удалось связаться с сервером. Убедитесь, что API запущен (порт 3000) и в .env.local указан верный NEXT_PUBLIC_API_URL (без /api в конце, например: http://localhost:3000).";
}

function parseAvailabilityError(
  e: unknown,
  fallbackLabel: string,
): AvailabilityPayload {
  const ax = e as AxiosError<ServerResponseType<AvailabilityPayload>>;
  const body = ax.response?.data;
  if (body?.message) {
    return {
      formatOk: false,
      available: null,
      message: body.message,
    };
  }
  if (body?.error && typeof body.error === "string") {
    return {
      formatOk: false,
      available: null,
      message: body.error,
    };
  }
  if (ax.response?.status) {
    return {
      formatOk: false,
      available: null,
      message: `Ошибка сервера (${ax.response.status}). Попробуйте позже.`,
    };
  }
  const code = ax.code;
  if (code === "ERR_NETWORK" || code === "ECONNREFUSED") {
    return {
      formatOk: false,
      available: null,
      message: networkFallback(),
    };
  }
  return {
    formatOk: false,
    available: null,
    message: `${fallbackLabel}: ${ax.message || networkFallback()}`,
  };
}

export async function checkEmailAvailability(
  email: string,
): Promise<AvailabilityPayload> {
  try {
    const { data } = await axiosInstance.post<
      ServerResponseType<AvailabilityPayload>
    >("auth/check-email", {
      email: email.trim().toLowerCase(),
    });
    if (data.statusCode !== 200 || data.data == null) {
      return {
        formatOk: false,
        available: null,
        message:
          data.message ?? data.error ?? "Не удалось проверить email",
      };
    }
    return data.data;
  } catch (e) {
    return parseAvailabilityError(e, "Email");
  }
}

export async function checkUsernameAvailability(
  username: string,
): Promise<AvailabilityPayload> {
  try {
    const { data } = await axiosInstance.post<
      ServerResponseType<AvailabilityPayload>
    >("auth/check-username", {
      username: username.trim().toLowerCase(),
    });
    if (data.statusCode !== 200 || data.data == null) {
      return {
        formatOk: false,
        available: null,
        message:
          data.message ??
          data.error ??
          "Не удалось проверить имя пользователя",
      };
    }
    return data.data;
  } catch (e) {
    return parseAvailabilityError(e, "Имя пользователя");
  }
}
