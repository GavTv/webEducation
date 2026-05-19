"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type AppProfileChipProps = {
  firstName: string;
  avatarSrc: string;
  avatarInitials: string;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
};

export function AppProfileChip({
  firstName,
  avatarSrc,
  avatarInitials,
  href,
  onClick,
  ariaLabel = "Профиль",
}: AppProfileChipProps) {
  const body: ReactNode = (
    <>
      <div className="app-profile-avatar">
        {avatarSrc ? (
          <img src={avatarSrc} alt="" className="app-profile-avatar-img" />
        ) : (
          avatarInitials
        )}
      </div>
      <div className="app-profile-text">
        <strong>{firstName}</strong>
        <span className="app-profile-status">
          <span className="app-online-dot" aria-hidden />
          Онлайн
        </span>
      </div>
    </>
  );

  if (href) {
    return (
      <Link className="app-profile-chip" href={href} aria-label={ariaLabel}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="app-profile-chip"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {body}
    </button>
  );
}
