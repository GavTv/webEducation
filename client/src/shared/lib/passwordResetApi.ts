import { axiosInstance } from "@/shared/lib/axiosInstance";
import type { ServerResponseType } from "@/shared/types";
import { AxiosError } from "axios";

function extractApiMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const d = err.response?.data as
      | Partial<ServerResponseType<unknown>>
      | undefined;
    if (d?.message) return d.message;
    if (d?.error) return d.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type ForgotOk = { ok: true };
type VerifyOk = { resetToken: string };

export async function postForgotPassword(email: string): Promise<void> {
  try {
    const { data } = await axiosInstance.post<ServerResponseType<ForgotOk>>(
      "auth/forgot-password",
      { email: email.trim().toLowerCase() },
    );
    if (data.statusCode !== 200) {
      throw new Error(data.message ?? data.error ?? "Ошибка запроса");
    }
  } catch (e) {
    throw new Error(extractApiMessage(e, "Не удалось отправить код"));
  }
}

export async function postVerifyResetCode(
  email: string,
  code: string,
): Promise<string> {
  try {
    const { data } = await axiosInstance.post<ServerResponseType<VerifyOk>>(
      "auth/verify-reset-code",
      { email: email.trim().toLowerCase(), code },
    );
    if (data.statusCode !== 200 || !data.data?.resetToken) {
      throw new Error(data.message ?? data.error ?? "Неверный код");
    }
    return data.data.resetToken;
  } catch (e) {
    throw new Error(extractApiMessage(e, "Неверный или просроченный код"));
  }
}

export async function postResetPasswordWithToken(
  resetToken: string,
  newPassword: string,
): Promise<void> {
  try {
    const { data } = await axiosInstance.post<ServerResponseType<null>>(
      "auth/reset-password",
      { resetToken, newPassword },
    );
    if (data.statusCode !== 200) {
      throw new Error(data.message ?? data.error ?? "Не удалось сменить пароль");
    }
  } catch (e) {
    throw new Error(extractApiMessage(e, "Не удалось сменить пароль"));
  }
}
