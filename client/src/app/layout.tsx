import type { Metadata } from "next";
import ApplicationLayout from "@/application/ApplicationLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "webEducation",
  description: "Клиент курса",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <ApplicationLayout>{children}</ApplicationLayout>
      </body>
    </html>
  );
}
