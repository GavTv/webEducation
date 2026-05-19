set -e

echo "Делаю backup..."
cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai
cp src/app/chat/page.css src/app/chat/page.css.backup-botai

python3 <<'PY'
from pathlib import Path
import sys

page = Path("src/app/chat/page.tsx")
css_path = Path("src/app/chat/page.css")

if not page.exists():
    sys.exit("❌ Нет файла src/app/chat/page.tsx")

if not css_path.exists():
    sys.exit("❌ Нет файла src/app/chat/page.css")

s = page.read_text()

s = s.replace(
    'import { Suspense, useCallback, useEffect, useMemo, useState } from "react";',
    'import { Suspense, useCallback, useEffect, useMemo, useState } from "react";\nimport type { FormEvent } from "react";',
)

s = s.replace(
    'const MOBILE_BP = "(max-width: 900px)";',
    '''const MOBILE_BP = "(max-width: 900px)";
const BOT_ROOM_ID = 999001;

type ChatMessage = {
  id: string;
  author: string;
  text: string;
  isMine?: boolean;
  isBot?: boolean;
};

type ChatRoom = (typeof rooms)[number];

const botRoom: ChatRoom = {
  id: BOT_ROOM_ID,
  title: "@botAi",
  icon: "🤖",
  iconClass: "purple",
  author: "@botAi",
  message: "Ваш AI-помощник. Задавайте вопросы!",
  time: "сейчас",
  onlineLabel: "AI-помощник онлайн",
};

const defaultMessagesByRoomId: Record<number, ChatMessage[]> = {
  [BOT_ROOM_ID]: [
    {
      id: "bot-start",
      author: "@botAi",
      text: "Напишите любой вопрос — я отвечу моковым ответом.",
      isBot: true,
    },
  ],
  1: [
    { id: "common-1", author: "Мария", text: "Всем привет! 👋" },
    {
      id: "common-2",
      author: "Алексей",
      text: "Кто уже сделал домашнее задание?",
      isMine: true,
    },
    {
      id: "common-3",
      author: "@botAi",
      text: "Я могу помочь объяснить тему или кратко суммировать чат.",
      isBot: true,
    },
  ],
};''',
)

old_state = '''  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState(rooms[0]?.id ?? 1);
  const [draft, setDraft] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const selected = useMemo(
    () => rooms.find((r) => r.id === selectedId) ?? rooms[0],
    [selectedId],
  );'''

new_state = '''  const searchParams = useSearchParams();
  const chatRooms = useMemo(() => [botRoom, ...rooms], []);
  const [selectedId, setSelectedId] = useState(chatRooms[0]?.id ?? BOT_ROOM_ID);
  const [draft, setDraft] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [messagesByRoomId, setMessagesByRoomId] =
    useState<Record<number, ChatMessage[]>>(defaultMessagesByRoomId);

  const selected = useMemo(
    () => chatRooms.find((r) => r.id === selectedId) ?? chatRooms[0],
    [chatRooms, selectedId],
  );

  const selectedMessages = messagesByRoomId[selected?.id ?? BOT_ROOM_ID] ?? [];
  const isBotChat = selected?.id === BOT_ROOM_ID;'''

if old_state not in s:
    sys.exit("❌ Не нашёл блок state в page.tsx. Возможно файл уже сильно изменён.")

s = s.replace(old_state, new_state)

s = s.replace(
    '  const closeMobileThread = useCallback(() => setMobileThreadOpen(false), []);',
    '''  const closeMobileThread = useCallback(() => setMobileThreadOpen(false), []);

  const openBotChat = useCallback(() => {
    selectRoom(BOT_ROOM_ID);
  }, [selectRoom]);

  const sendMessage = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = draft.trim();

      if (!text || !selected) return;

      const userMessage: ChatMessage = {
        id: `${selected.id}-user-${Date.now()}`,
        author: safeFirstName,
        text,
        isMine: true,
      };

      const botReply: ChatMessage = {
        id: `${selected.id}-bot-${Date.now()}`,
        author: "@botAi",
        text: "привет",
        isBot: true,
      };

      setMessagesByRoomId((prev) => ({
        ...prev,
        [selected.id]: [
          ...(prev[selected.id] ?? []),
          userMessage,
          ...(isBotChat ? [botReply] : []),
        ],
      }));

      setDraft("");
    },
    [draft, isBotChat, safeFirstName, selected],
  );''',
)

s = s.replace("{rooms.map((room) => (", "{chatRooms.map((room) => (")
s = s.replace(
    '<button type="button">Написать</button>',
    '<button type="button" onClick={openBotChat}>Написать</button>',
)

old_messages = '''            <div className="messages">
              <div className="message">
                <b>Мария</b>
                <p>Всем привет! 👋</p>
              </div>
              <div className="message">
                <b>Алексей</b>
                <p>Кто уже сделал домашнее задание?</p>
              </div>
              <div className="message bot">
                <b>@botAi</b>
                <p>Я могу помочь объяснить тему или кратко суммировать чат.</p>
              </div>
            </div>

            <div className="message-input">
              <input
                placeholder="Напишите сообщение..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="button" aria-label="Отправить">
                ➤
              </button>
            </div>'''

new_messages = '''            <div className="messages">
              {selectedMessages.map((message) => (
                <div
                  key={message.id}
                  className={`message${message.isMine ? " mine" : ""}${
                    message.isBot ? " bot" : ""
                  }`}
                >
                  <b>{message.author}</b>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <form className="message-input" onSubmit={sendMessage}>
              <input
                placeholder={
                  isBotChat
                    ? "Напишите сообщение боту..."
                    : "Напишите сообщение..."
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" aria-label="Отправить" disabled={!draft.trim()}>
                ➤
              </button>
            </form>'''

if old_messages not in s:
    sys.exit("❌ Не нашёл блок сообщений в page.tsx. Возможно файл уже изменён.")

s = s.replace(old_messages, new_messages)

page.write_text(s)

css = css_path.read_text()

css = css.replace(
    '''.message:nth-child(2) {
  margin-left: auto;
  background: rgba(124, 60, 255, 0.18);
}''',
    '''.message.mine {
  margin-left: auto;
  background: rgba(124, 60, 255, 0.18);
}''',
)

if ".message-input button:disabled" not in css:
    css = css.replace(
        '''.bot-card button,
.message-input button {
  border: 0;
  border-radius: 16px;
  padding: 12px 18px;
  color: white;
  background: linear-gradient(135deg, #8b5cf6, #5b31d6);
  font-weight: 800;
  cursor: pointer;
}''',
        '''.bot-card button,
.message-input button {
  border: 0;
  border-radius: 16px;
  padding: 12px 18px;
  color: white;
  background: linear-gradient(135deg, #8b5cf6, #5b31d6);
  font-weight: 800;
  cursor: pointer;
}

.message-input button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}''',
    )

css_path.write_text(css)

print("✅ BotAI chat patch applied")
PY

echo "Готово. Теперь запусти проект:"
echo "npm run dev"
