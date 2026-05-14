/** Общие типы клиента — добавляй по мере необходимости. */

export type ServerResponseType<T> = {
  statusCode: number;
  message: string;
  data: T | null;
  error: string | null;
};
