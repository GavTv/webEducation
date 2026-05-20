import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

async function runAuthHandler(
  req: NextRequest,
  context: RouteContext,
  method: "GET" | "POST",
) {
  await context.params;
  const handler = method === "GET" ? handlers.GET : handlers.POST;
  return handler(req);
}

export function GET(req: NextRequest, context: RouteContext) {
  return runAuthHandler(req, context, "GET");
}

export function POST(req: NextRequest, context: RouteContext) {
  return runAuthHandler(req, context, "POST");
}
