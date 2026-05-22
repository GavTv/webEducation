"use client";

import { usePathname } from "next/navigation";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import { getAvatarSrc } from "@/shared/lib/getAvatarSrc";
import { getNameInitials } from "@/shared/lib/getNameInitials";
import { AppProfileChip } from "./AppProfileChip";

const AUTH_PATH_PREFIXES = [
  "/auth",
  "/forgot-password",
  "/reset-password",
] as const;

function isAuthRoute(pathname: string) {
  return AUTH_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Аватар профиля справа сверху (мобилка), кроме входа и регистрации. */
export function MobileProfileFloating() {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user.user);

  if (
    !user ||
    pathname === "/" ||
    pathname === clientRoutes.profile ||
    pathname.startsWith(`${clientRoutes.profile}/`) ||
    isAuthRoute(pathname)
  ) {
    return null;
  }

  const userName = user.name?.trim() || "";
  const nameParts = userName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Пользователь";
  const lastName = nameParts[1] || "";

  return (
    <div className="mobile-profile-fab">
      <AppProfileChip
        firstName={firstName}
        avatarSrc={getAvatarSrc(user.avatarUrl)}
        avatarInitials={getNameInitials(firstName, lastName, user.name)}
        href={clientRoutes.profile}
        ariaLabel={`Профиль: ${firstName}`}
      />
    </div>
  );
}
