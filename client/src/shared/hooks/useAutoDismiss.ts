import { useEffect, useRef } from "react";

const DEFAULT_DISMISS_MS = 7000;

/** Скрывает сообщение через `delayMs` после появления (`active === true`). */
export function useAutoDismiss(
  active: boolean,
  onDismiss: () => void,
  delayMs = DEFAULT_DISMISS_MS,
) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const id = window.setTimeout(() => {
      onDismissRef.current();
    }, delayMs);

    return () => window.clearTimeout(id);
  }, [active, delayMs]);
}
