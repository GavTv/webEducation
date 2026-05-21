"use client";

import Link from "next/link";
import { BookOpen, MessageCircle, User } from "lucide-react";
import { clientRoutes } from "@/shared/consts/clientRoutes";

export type MobileTab = "classes" | "chat" | "profile";

type MobileBottomNavProps = {
  active: MobileTab;
};

export function MobileBottomNav({ active }: MobileBottomNavProps) {
  return (
    <nav className="app-mobile-tabbar" aria-label="Основная навигация">
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
