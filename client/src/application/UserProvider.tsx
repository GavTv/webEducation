"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/shared/hooks/useReduxHooks";
import { refreshTokenThunk } from "@/entities/user/api/UserApiThunk";

export default function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(refreshTokenThunk());
  }, [dispatch]);

  return <>{children}</>;
}
