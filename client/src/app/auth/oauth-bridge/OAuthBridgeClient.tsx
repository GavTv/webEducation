"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { loginWithOAuthThunk } from "@/entities/user/api/UserApiThunk";
import { useAppDispatch } from "@/shared/hooks/useReduxHooks";
import {
  authPath,
  clientRoutes,
} from "@/shared/consts/clientRoutes";

export default function OAuthBridgeClient() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  const remember = searchParams.get("remember") === "1";

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(authPath("login"));
      return;
    }
    const access = session?.oauthAccessToken;
    const provider = session?.oauthProvider;
    if (
      !access ||
      (provider !== "google" && provider !== "github")
    ) {
      router.replace(authPath("login"));
      return;
    }
    if (ran.current) return;
    ran.current = true;
    let cancelled = false;
    (async () => {
      try {
        await dispatch(
          loginWithOAuthThunk({
            provider,
            accessToken: access,
            rememberMe: remember,
          }),
        ).unwrap();
        if (cancelled) return;
        await signOut({ redirect: false });
        if (!cancelled) router.replace(clientRoutes.classes);
      } catch (e) {
        ran.current = false;
        await signOut({ redirect: false });
        if (!cancelled) {
          setError(
            typeof e === "string"
              ? e
              : "Не удалось завершить вход. Попробуйте снова.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    status,
    session?.oauthAccessToken,
    session?.oauthProvider,
    remember,
    dispatch,
    router,
  ]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#0d0d12",
        color: "#e5e7eb",
        padding: 24,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {error ? (
        <>
          <div>
            <p style={{ margin: "0 0 16px", maxWidth: 360 }}>{error}</p>
            <Link
              href={authPath("login")}
              style={{ color: "#a78bfa", fontWeight: 600 }}
            >
              На главную
            </Link>
          </div>
        </>
      ) : (
        <p style={{ margin: 0, color: "#9ca3af" }}>Завершение входа…</p>
      )}
    </div>
  );
}
