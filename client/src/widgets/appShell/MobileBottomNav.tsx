"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircle, Settings, User } from "lucide-react";
import { clientRoutes } from "@/shared/consts/clientRoutes";

export type MobileTab = "classes" | "chat" | "profile" | "admin";

type MobileBottomNavProps = {
  active: MobileTab;
  /** Ссылка «Управление» только для администратора */
  showAdminLink?: boolean;
};

export function MobileBottomNav({
  active,
  showAdminLink = false,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const currentTab: MobileTab = pathname.startsWith(clientRoutes.chat)
    ? "chat"
    : pathname.startsWith(clientRoutes.profile)
      ? "profile"
      : pathname.startsWith(clientRoutes.admin)
        ? "admin"
        : pathname.startsWith(clientRoutes.classes)
          ? "classes"
          : active;

  const tabClassName = (tab: MobileTab) =>
    `app-mobile-tab${currentTab === tab ? " app-mobile-tab--active" : ""}`;

  return (
    <nav
      className={`app-mobile-tabbar${showAdminLink ? " app-mobile-tabbar--with-admin" : ""}`}
      aria-label="Основная навигация"
    >
      <Link
        className={tabClassName("classes")}
        href={clientRoutes.classes}
        aria-current={currentTab === "classes" ? "page" : undefined}
      >
        <BookOpen size={22} strokeWidth={2} aria-hidden />
        <span>Группы</span>
      </Link>
      <Link
        className={tabClassName("chat")}
        href={clientRoutes.chat}
        aria-current={currentTab === "chat" ? "page" : undefined}
      >
        <MessageCircle size={22} strokeWidth={2} aria-hidden />
        <span>Чаты</span>
      </Link>
      {showAdminLink ? (
        <Link
          className={tabClassName("admin")}
          href={clientRoutes.admin}
          aria-label="Управление"
          aria-current={currentTab === "admin" ? "page" : undefined}
        >
          <Settings size={22} strokeWidth={2} aria-hidden />
          <span>Управление</span>
        </Link>
      ) : null}
      <Link
        className={tabClassName("profile")}
        href={clientRoutes.profile}
        aria-current={currentTab === "profile" ? "page" : undefined}
      >
        <User size={22} strokeWidth={2} aria-hidden />
        <span>Профиль</span>
      </Link>
    </nav>
  );
}
