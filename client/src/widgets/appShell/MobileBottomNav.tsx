"use client";

import Link from "next/link";
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
  return (
    <nav
      className={`app-mobile-tabbar${showAdminLink ? " app-mobile-tabbar--with-admin" : ""}`}
      aria-label="Основная навигация"
    >
      <Link
        className={`app-mobile-tab${active === "classes" ? " app-mobile-tab--active" : ""}`}
        href={clientRoutes.classes}
      >
        <BookOpen size={22} strokeWidth={2} aria-hidden />
        <span>Группы</span>
      </Link>
      <Link
        className={`app-mobile-tab${active === "chat" ? " app-mobile-tab--active" : ""}`}
        href={clientRoutes.chat}
      >
        <MessageCircle size={22} strokeWidth={2} aria-hidden />
        <span>Чаты</span>
      </Link>
      {showAdminLink ? (
        <Link
          className={`app-mobile-tab${active === "admin" ? " app-mobile-tab--active" : ""}`}
          href={clientRoutes.admin}
          aria-label="Управление"
        >
          <Settings size={22} strokeWidth={2} aria-hidden />
          <span>Управление</span>
        </Link>
      ) : null}
      <Link
        className={`app-mobile-tab${active === "profile" ? " app-mobile-tab--active" : ""}`}
        href={clientRoutes.profile}
      >
        <User size={22} strokeWidth={2} aria-hidden />
        <span>Профиль</span>
      </Link>
    </nav>
  );
}
