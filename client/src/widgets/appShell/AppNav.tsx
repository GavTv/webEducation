"use client";

import Link from "next/link";
import { BookOpen, MessageCircle, Settings, User } from "lucide-react";
import { clientRoutes } from "@/shared/consts/clientRoutes";

const NAV_ICON_SIZE = 22;

type AppNavProps = {
  active: "classes" | "chat" | "profile" | "admin";
  showAdminLink?: boolean;
};

export function AppNav({ active, showAdminLink }: AppNavProps) {
  return (
    <nav className="sidebar-nav">
      <Link
        className={`nav-link ${active === "classes" ? "active" : ""}`}
        href={clientRoutes.classes}
      >
        <span className="nav-icon" aria-hidden>
          <BookOpen size={NAV_ICON_SIZE} strokeWidth={2} />
        </span>
        Группы
      </Link>

      <Link
        className={`nav-link ${active === "chat" ? "active" : ""}`}
        href={clientRoutes.chat}
      >
        <span className="nav-icon" aria-hidden>
          <MessageCircle size={NAV_ICON_SIZE} strokeWidth={2} />
        </span>
        Чаты
      </Link>

      {showAdminLink ? (
        <Link
          className={`nav-link ${active === "admin" ? "active" : ""}`}
          href={clientRoutes.admin}
        >
          <span className="nav-icon" aria-hidden>
            <Settings size={NAV_ICON_SIZE} strokeWidth={2} />
          </span>
          Управление
        </Link>
      ) : null}

      <Link
        className={`nav-link ${active === "profile" ? "active" : ""}`}
        href={clientRoutes.profile}
      >
        <span className="nav-icon" aria-hidden>
          <User size={NAV_ICON_SIZE} strokeWidth={2} />
        </span>
        Профиль
      </Link>
    </nav>
  );
}
