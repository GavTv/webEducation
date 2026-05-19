"use client";

import Link from "next/link";
import { clientRoutes } from "@/shared/consts/clientRoutes";

type AppNavProps = {
  active: "classes" | "chat" | "profile" | "admin";
  showAdminLink?: boolean;
  /** На странице чатов первым пунктом — «Чаты», иначе «Классы». */
  variant?: "classes" | "chat";
};

export function AppNav({
  active,
  showAdminLink,
  variant = "classes",
}: AppNavProps) {
  return (
    <nav className="sidebar-nav">
      {variant === "chat" ? (
        <Link
          className={`nav-link ${active === "chat" ? "active" : ""}`}
          href={clientRoutes.chat}
        >
          <span className="nav-icon">●</span>
          Чаты
        </Link>
      ) : (
        <Link
          className={`nav-link ${active === "classes" ? "active" : ""}`}
          href={clientRoutes.classes}
        >
          <span className="nav-icon">●</span>
          Классы
        </Link>
      )}

      {showAdminLink ? (
        <Link
          className={`nav-link ${active === "admin" ? "active" : ""}`}
          href={clientRoutes.admin}
        >
          <span className="nav-icon">⚙</span>
          Управление
        </Link>
      ) : null}

      <Link
        className={`nav-link ${active === "profile" ? "active" : ""}`}
        href={clientRoutes.profile}
      >
        <span className="nav-icon">♙</span>
        Профиль
      </Link>
    </nav>
  );
}
