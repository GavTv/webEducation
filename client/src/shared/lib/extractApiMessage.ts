import { AxiosError } from "axios";
import type { ServerResponseType } from "@/shared/types";

export function extractApiMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const d = err.response?.data as
      | Partial<ServerResponseType<unknown>>
      | undefined;
    if (typeof d?.message === "string" && d.message.trim()) {
      return d.message;
    }
    if (typeof d?.error === "string" && d.error.trim()) {
      return d.error;
    }
  }
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg && !/^Request failed with status code \d+$/i.test(msg)) {
      return msg;
    }
  }
  return fallback;
}
