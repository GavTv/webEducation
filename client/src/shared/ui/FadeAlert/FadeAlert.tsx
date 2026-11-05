"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FadeAlert.module.css";

export const FADE_ALERT_MS = 350;

type FadeAlertProps = {
  text?: string | null;
  className?: string;
  role?: "alert" | "status";
};

export function FadeAlert({
  text,
  className,
  role = "alert",
}: FadeAlertProps) {
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const textRef = useRef(text);

  textRef.current = text;

  useEffect(() => {
    if (text) {
      setDisplayText(text);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => {
      if (!textRef.current) {
        setDisplayText(null);
      }
    }, FADE_ALERT_MS);

    return () => clearTimeout(timer);
  }, [text]);

  if (!displayText) {
    return null;
  }

  return (
    <p
      role={role}
      data-visible={visible ? "true" : "false"}
      className={[styles.alert, className].filter(Boolean).join(" ")}
    >
      {displayText}
    </p>
  );
}
