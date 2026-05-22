import axios from "axios";
import { axiosInstance } from "@/shared/lib/axiosInstance";

export type BotAiResponse = {
  answer: string;
  error?: string;
  used?: number;
  limit?: number;
};

export async function sendBotAiMessage(message: string): Promise<BotAiResponse> {
  try {
    const { data } = await axiosInstance.post<BotAiResponse>("ai/chat", {
      message,
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const body = error.response.data as Partial<BotAiResponse>;
      if (typeof body.answer === "string") {
        return {
          answer: body.answer,
          error: body.error,
          used: body.used,
          limit: body.limit,
        };
      }
    }
    throw error;
  }
}
