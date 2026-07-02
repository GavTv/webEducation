import type { Metadata } from "next";
import ApplicationLayout from "@/application/ApplicationLayout";
import StoreProvider from "./store/storeProvider";
import UserProvider from "@/application/UserProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Work Chat",
  description: "Рабочий чат для команды",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <StoreProvider>
          <UserProvider>
            <ApplicationLayout>{children}</ApplicationLayout>
          </UserProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
