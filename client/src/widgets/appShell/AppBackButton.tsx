"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "./AppBackButton.css";

type AppBackButtonProps = {
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
};

export function AppBackButton({
  href,
  onClick,
  ariaLabel = "Назад",
  className = "",
}: AppBackButtonProps) {
  const classes = `app-back-btn${className ? ` ${className}` : ""}`;
  const icon = (
    <ArrowLeft className="app-back-btn__icon" size={20} strokeWidth={2} aria-hidden />
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} aria-label={ariaLabel}>
      {icon}
    </button>
  );
}
