"use client";

import Link from "next/link";
import { clientRoutes } from "@/shared/consts/clientRoutes";

type AppNavProps = {
  active: "classes" | "profile" | "admin";
  showAdminLink?: boolean;
};

export function AppNav({ active, showAdminLink }: AppNavProps) {
  return (
    <nav className="sidebar-nav">
      <Link
        className={`nav-link ${active === "classes" ? "active" : ""}`}
        href={clientRoutes.classes}
      >
        <span className="nav-icon">●</span>
        Классы
      </Link>

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
