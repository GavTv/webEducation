"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/shared/hooks/useReduxHooks";
import { refreshTokenThunk } from "@/entities/user/api/UserApiThunk";
import { setAuthBootstrapDone } from "@/shared/lib/axiosInstance";
import { UserErrorAutoClear } from "./UserErrorAutoClear";

export default function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(refreshTokenThunk()).finally(() => {
      setAuthBootstrapDone(true);
    });
  }, [dispatch]);

  return (
    <>
      <UserErrorAutoClear />
      {children}
    </>
  );
}
