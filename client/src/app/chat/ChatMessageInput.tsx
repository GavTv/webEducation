"use client";

import dynamic from "next/dynamic";
import { Paperclip, Send, Smile } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((mod) => mod.default),
  { ssr: false, loading: () => null },
);

type ChatMessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
};

export function ChatMessageInput({
  value,
  onChange,
  onSubmit,
  placeholder,
}: ChatMessageInputProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);

  const insertEmoji = useCallback(
    (emoji: string) => {
      const input = inputRef.current;
      if (!input) {
        onChange(value + emoji);
        return;
      }

      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? value.length;
      const next = value.slice(0, start) + emoji + value.slice(end);
      const caret = start + emoji.length;

      onChange(next);

      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(caret, caret);
      });
    },
    [onChange, value],
  );

  const handleEmojiClick = useCallback(
    (data: EmojiClickData) => {
      insertEmoji(data.emoji);
    },
    [insertEmoji],
  );

  const toggleEmojiPicker = useCallback(() => {
    setEmojiOpen((open) => !open);
  }, []);

  useEffect(() => {
    if (!emojiOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        pickerRef.current?.contains(target) ||
        emojiBtnRef.current?.contains(target)
      ) {
        return;
      }
      setEmojiOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [emojiOpen]);

  useEffect(() => {
    if (!emojiOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setEmojiOpen(false);
        emojiBtnRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [emojiOpen]);

  return (
    <div className="message-input-wrap">
      {emojiOpen ? (
        <div
          ref={pickerRef}
          className="emoji-picker-popover"
          role="dialog"
          aria-label="Выбор смайлика"
        >
          <EmojiPicker
            theme={Theme.DARK}
            searchPlaceholder="Поиск смайлика"
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
            onEmojiClick={handleEmojiClick}
          />
        </div>
      ) : null}

      <form className="message-input" onSubmit={onSubmit}>
        <button
          type="button"
          className="message-attach-btn"
          aria-label="Прикрепить файл"
          tabIndex={-1}
        >
          <Paperclip size={20} strokeWidth={2} aria-hidden />
        </button>

        <button
          ref={emojiBtnRef}
          type="button"
          className={`message-emoji-btn${emojiOpen ? " message-emoji-btn--active" : ""}`}
          aria-label={emojiOpen ? "Закрыть смайлики" : "Открыть смайлики"}
          aria-expanded={emojiOpen}
          aria-haspopup="dialog"
          onClick={toggleEmojiPicker}
        >
          <Smile size={20} strokeWidth={2} aria-hidden />
        </button>

        <input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        <button
          type="submit"
          className="message-send-btn"
          aria-label="Отправить"
          disabled={!value.trim()}
        >
          <Send size={20} strokeWidth={2} aria-hidden />
        </button>
      </form>
    </div>
  );
}
