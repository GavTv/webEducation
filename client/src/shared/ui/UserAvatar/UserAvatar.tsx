"use client";

import { useEffect, useState } from "react";

type UserAvatarProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback: React.ReactNode;
};

export function UserAvatar({
  src,
  alt = "",
  className,
  fallback,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
