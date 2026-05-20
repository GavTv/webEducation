import type { ReactNode } from "react";
import AuthSessionProvider from "@/application/AuthSessionProvider";

export default function OAuthBridgeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
