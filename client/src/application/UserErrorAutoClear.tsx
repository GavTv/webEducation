"use client";

import { setError } from "@/entities/user/slice/userSlice";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import { useAutoDismiss } from "@/shared/hooks/useAutoDismiss";

export function UserErrorAutoClear() {
  const dispatch = useAppDispatch();
  const error = useAppSelector((s) => s.user.error);

  useAutoDismiss(Boolean(error), () => {
    dispatch(setError(null));
  });

  return null;
}
