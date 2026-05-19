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
  /** false — только отображение, без перехода */
  interactive?: boolean;
};

export function AppProfileChip({
  firstName,
  avatarSrc,
  avatarInitials,
  href,
  onClick,
  ariaLabel = "Профиль",
  interactive = true,
}: AppProfileChipProps) {
  const avatarInner = avatarSrc ? (
    <img src={avatarSrc} alt="" className="app-profile-avatar-img" />
  ) : (
    avatarInitials
  );

  const body: ReactNode = (
    <>
      <div className="app-profile-avatar-wrap">
        <div className="app-profile-avatar">{avatarInner}</div>
        <span className="app-online-dot app-online-dot--corner" aria-hidden />
      </div>
      <div className="app-profile-text">
        <strong>{firstName}</strong>
      </div>
    </>
  );

  if (!interactive) {
    return (
      <div
        className="app-profile-chip app-profile-chip--static"
        role="img"
        aria-label={ariaLabel}
      >
        {body}
      </div>
    );
  }

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
