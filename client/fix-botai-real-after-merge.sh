set -e

echo "📦 Backup..."
cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai-real-after-merge

python3 <<'PY'
from pathlib import Path
import re
import sys

path = Path("src/app/chat/page.tsx")
s = path.read_text()

# 1. Убираем botRoom из списка чатов, чтобы @botAi не был обычной комнатой
s = s.replace(
'''  const chatRooms = useMemo(
    () => [botRoom, ...memberClasses.map(classToChatRoom)],
    [memberClasses],
  );''',
'''  const chatRooms = useMemo(
    () => memberClasses.map(classToChatRoom),
    [memberClasses],
  );'''
)

# 2. Не выбираем BOT_ROOM_ID как обычный чат
s = s.replace(
'  const [selectedId, setSelectedId] = useState(BOT_ROOM_ID);',
'  const [selectedId, setSelectedId] = useState(0);'
)

# 3. Исправляем пустой список
s = s.replace(
'!roomsLoading && filteredRooms.length <= 1 ?',
'!roomsLoading && filteredRooms.length === 0 ?'
)

# 4. Если после загрузки классов ничего не выбрано — выбираем первый реальный чат
if "auto-select first real chat" not in s:
    marker = '''  const selected = useMemo(
    () => chatRooms.find((room) => room.id === selectedId) ?? chatRooms[0],
    [chatRooms, selectedId],
  );'''
    insert = marker + '''

  // auto-select first real chat
  useEffect(() => {
    if (!botAiOpen && selectedId === 0 && chatRooms[0]) {
      setSelectedId(chatRooms[0].id);
    }
  }, [botAiOpen, chatRooms, selectedId]);'''
    if marker not in s:
        sys.exit("❌ Не найден блок selected")
    s = s.replace(marker, insert)

# 5. Кнопка "Написать" у bot-card должна открывать отдельный режим botAiOpen
s = s.replace(
'''  const openBotChat = useCallback(() => {
    selectRoom(BOT_ROOM_ID);
  }, [selectRoom]);''',
'''  const openBotChat = useCallback(() => {
    setBotAiOpen(true);

    if (typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches) {
      setMobileThreadOpen(true);
    }
  }, []);'''
)

# Если openBotChat уже другой — оставляем, главное чтобы не было selectRoom(BOT_ROOM_ID)
s = s.replace("selectRoom(BOT_ROOM_ID);", "setBotAiOpen(true);")

# 6. Добавляем/исправляем sendBotAiMessage, если его нет
if "const sendBotAiMessage = useCallback" not in s:
    anchor = '''  const sendMessage = useCallback(
    (event: FormEvent<HTMLFormElement>) => {'''
    if anchor not in s:
        sys.exit("❌ Не найден sendMessage")

    # вставим перед return (
    return_marker = "  return ("
    bot_func = '''  const sendBotAiMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = botAiDraft.trim();

      if (!text || botAiLoading) return;

      setBotAiMessages((prev) => [
        ...prev,
        {
          id: `botai-user-${Date.now()}`,
          author: "Вы",
          text,
          time: formatTime(),
          isMine: true,
        },
      ]);

      setBotAiDraft("");
      setBotAiLoading(true);

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: text }),
        });

        const data = await response.json().catch(() => null);

        setBotAiMessages((prev) => [
          ...prev,
          {
            id: `botai-answer-${Date.now()}`,
            author: "@botAi",
            text: data?.answer || "Не получилось получить ответ от AI.",
            time: formatTime(),
            isBot: true,
            isError: !response.ok,
          },
        ]);
      } catch {
        setBotAiMessages((prev) => [
          ...prev,
          {
            id: `botai-error-${Date.now()}`,
            author: "@botAi",
            text: "Ошибка соединения с AI route.",
            time: formatTime(),
            isBot: true,
            isError: true,
          },
        ]);
      } finally {
        setBotAiLoading(false);
      }
    },
    [botAiDraft, botAiLoading],
  );

'''
    if return_marker not in s:
        sys.exit("❌ Не найден return")
    s = s.replace(return_marker, bot_func + return_marker)

# 7. В правой панели заголовок должен учитывать botAiOpen
s = s.replace(
'''              <div className={`thread-avatar ${selected?.iconClass ?? "purple"}`}>
                {selected?.icon ?? "🤖"}
              </div>''',
'''              <div className={`thread-avatar ${botAiOpen ? "purple" : selected?.iconClass ?? "purple"}`}>
                {botAiOpen ? "🤖" : selected?.icon ?? "#"}
              </div>'''
)

s = s.replace(
'''                <h2>{selected?.title ?? "Чат"}</h2>''',
'''                <h2>{botAiOpen ? "@botAi" : selected?.title ?? "Чат"}</h2>'''
)

s = s.replace(
'''                  {isRealChat
                    ? wsConnected
                      ? selected?.onlineLabel ?? "Подключено"
                      : "Подключение…"
                    : (selected?.onlineLabel ?? "AI-помощник")}''',
'''                  {botAiOpen
                    ? "AI-помощник по программированию"
                    : isRealChat
                      ? wsConnected
                        ? selected?.onlineLabel ?? "Подключено"
                        : "Подключение…"
                      : (selected?.onlineLabel ?? "Чат")}'''
)

# 8. Сообщения в правой панели: если botAiOpen — показываем botAiMessages
s = s.replace(
'''              {selectedMessages.map((message) => (''',
'''              {(botAiOpen ? botAiMessages : selectedMessages).map((message) => ('''
)

s = s.replace(
'''                      {message.isBot ? "🤖" : message.author.charAt(0)}''',
'''                      {botAiOpen || message.isBot ? "🤖" : message.author.charAt(0)}'''
)

s = s.replace(
'''                        <time>{message.time}</time>''',
'''                        <time>{message.time ?? ""}</time>'''
)

# 9. Добавляем "Печатает..." для AI
if "botAiLoading ? (" not in s:
    s = s.replace(
'''              <div ref={messagesEndRef} className="messages-end" aria-hidden />''',
'''              {botAiOpen && botAiLoading ? (
                <article className="message-row message-row--bot">
                  <div className="message-avatar purple" aria-hidden>
                    🤖
                  </div>
                  <div className="message-bubble message-bubble--bot">
                    <span className="message-author">@botAi</span>
                    <div className="message-body">
                      <p>Печатает...</p>
                      <footer className="message-footer">
                        <time />
                      </footer>
                    </div>
                  </div>
                </article>
              ) : null}
              <div ref={messagesEndRef} className="messages-end" aria-hidden />'''
    )

# 10. Input: если botAiOpen — отправляем в /api/ai, иначе обычный чат
s = re.sub(
r'''            <ChatMessageInput
              value=\{draft\}
              onChange=\{setDraft\}
              onSubmit=\{sendMessage\}
              disabled=\{isRealChat && !wsConnected\}
              placeholder=\{
                isBotChat
                  \? "Напишите сообщение боту\.\.\."
                  : isRealChat && !wsConnected
                    \? "Подключение к чату…"
                    : "Напишите сообщение\.\.\."
              \}
            />''',
'''            <ChatMessageInput
              value={botAiOpen ? botAiDraft : draft}
              onChange={botAiOpen ? setBotAiDraft : setDraft}
              onSubmit={botAiOpen ? sendBotAiMessage : sendMessage}
              disabled={botAiOpen ? botAiLoading : isRealChat && !wsConnected}
              placeholder={
                botAiOpen
                  ? "Вопрос по программированию..."
                  : isRealChat && !wsConnected
                    ? "Подключение к чату…"
                    : "Напишите сообщение..."
              }
            />''',
s
)

# 11. Чтобы обычная отправка больше никогда не мокала через botRoom
s = re.sub(
r'''      if \(isBotChat\) \{[\s\S]*?        return;
      \}

      const socket = socketRef\.current;''',
'''      const socket = socketRef.current;''',
s
)

# 12. Зависимости sendMessage
s = s.replace(
"    [draft, displayAuthorName, isBotChat, selected],",
"    [draft, selected],"
)

path.write_text(s)
print("✅ page.tsx пропатчен")
PY

echo "✅ Проверяю сборку..."
npm run build
