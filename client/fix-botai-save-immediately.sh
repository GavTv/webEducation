set -e

cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai-save-immediately

python3 <<'PY'
from pathlib import Path

path = Path("src/app/chat/page.tsx")
text = path.read_text()

# 1. Удаляем текущую sendBotAiMessage, если она есть
needle = "  const sendBotAiMessage = useCallback("
start = text.find(needle)

if start != -1:
    end = text.find("\n  return (", start)
    if end == -1:
        raise SystemExit("❌ Не нашёл return после sendBotAiMessage")
    text = text[:start] + text[end:]

# 2. Добавляем функцию сохранения сообщений сразу перед return
bot_block = '''
  const saveBotAiMessages = useCallback((messages: BotAiMessage[]) => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      BOT_AI_MESSAGES_STORAGE_KEY,
      JSON.stringify(messages),
    );
  }, []);

  const addBotAiMessage = useCallback(
    (message: BotAiMessage) => {
      setBotAiMessages((prev) => {
        const next = [...prev, message];

        saveBotAiMessages(next);

        return next;
      });
    },
    [saveBotAiMessages],
  );

  const sendBotAiMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = botAiDraft.trim();

      if (!text || botAiLoading) return;

      addBotAiMessage({
        id: `botai-user-${Date.now()}`,
        author: "Вы",
        text,
        time: formatTime(),
        isMine: true,
      });

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

        addBotAiMessage({
          id: `botai-answer-${Date.now()}`,
          author: "@botAi",
          text: data?.answer || "Не получилось получить ответ от AI.",
          time: formatTime(),
          isBot: true,
          isError: !response.ok,
        });
      } catch {
        addBotAiMessage({
          id: `botai-error-${Date.now()}`,
          author: "@botAi",
          text: "Ошибка соединения с AI route.",
          time: formatTime(),
          isBot: true,
          isError: true,
        });
      } finally {
        setBotAiLoading(false);
      }
    },
    [addBotAiMessage, botAiDraft, botAiLoading],
  );

'''

marker = "\n  return ("
if marker not in text:
    raise SystemExit("❌ Не найден главный return")

text = text.replace(marker, "\n" + bot_block + "  return (", 1)

path.write_text(text)

print("✅ botAi теперь сохраняет сообщения сразу при добавлении")
PY

npm run build
