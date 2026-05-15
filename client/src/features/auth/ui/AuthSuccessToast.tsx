"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import { clearAuthSuccessToast } from "@/entities/user/slice/userSlice";
import styles from "./AuthSuccessToast.module.css";

const TOAST_MS = 5000;

type Pane = {
  text: string;
  phase: "entering" | "visible" | "exiting";
};

export default function AuthSuccessToast() {
  const message = useAppSelector((s) => s.user.authSuccessToast);
  const dispatch = useAppDispatch();
  const [pane, setPane] = useState<Pane | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const paneRef = useRef<Pane | null>(null);
  paneRef.current = pane;

  useEffect(() => {
    if (message) {
      setPane({ text: message, phase: "entering" });
    }
  }, [message]);

  useLayoutEffect(() => {
    if (!pane || pane.phase !== "entering") return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPane((p) => (p && p.phase === "entering" ? { ...p, phase: "visible" } : p));
      });
    });
    return () => cancelAnimationFrame(id);
  }, [pane?.text, pane?.phase]);

  useEffect(() => {
    if (!pane || pane.phase !== "visible") return;
    exitTimerRef.current = window.setTimeout(() => {
      setPane((p) => (p && p.phase === "visible" ? { ...p, phase: "exiting" } : p));
    }, TOAST_MS);
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, [pane?.text, pane?.phase]);

  useEffect(() => {
    if (message) return;
    if (!pane) return;
    if (pane.phase === "exiting") return;
    if (pane.phase === "entering") {
      setPane(null);
      return;
    }
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    setPane((p) => (p ? { ...p, phase: "exiting" } : null));
  }, [message, pane]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "opacity") return;
    if (e.target !== e.currentTarget) return;
    // Нельзя вызывать dispatch внутри setState-updater — ломает React (редux → повторный рендер).
    if (paneRef.current?.phase !== "exiting") return;
    setPane(null);
    queueMicrotask(() => {
      dispatch(clearAuthSuccessToast());
    });
  };

  if (!pane || typeof document === "undefined") return null;

  const visible = pane.phase !== "entering";
  const exiting = pane.phase === "exiting";

  return createPortal(
    <div
      className={`${styles.toast}${visible ? ` ${styles.visible}` : ""}${exiting ? ` ${styles.exiting}` : ""}`}
      role="status"
      aria-live="polite"
      onTransitionEnd={handleTransitionEnd}
    >
      {pane.text}
    </div>,
    document.body,
  );
}
