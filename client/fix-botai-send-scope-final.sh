set -e

cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai-send-scope-final

python3 <<'PY'
from pathlib import Path
import re

path = Path("src/app/chat/page.tsx")
text = path.read_text()

# 1. Удаляем все старые/кривые sendBotAiMessage
pattern = re.compile(
    r'\n\s*const sendBotAiMessage = useCallback\([\s\S]*?\n\s*\);\n',
    re.MULTILINE,
)

text, count = pattern.subn("\n", text)
print(f"Удалено старых sendBotAiMessage: {count}")

# 2. Вставляем одну правильную функцию именно перед return ChatPageContent
bot_func = '''
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

marker = '''  return (
    <main
      className={`educhat-page'''

if marker not in text:
    raise SystemExit("❌ Не найден return ChatPageContent")

text = text.replace(marker, bot_func + marker, 1)

path.write_text(text)

print("✅ sendBotAiMessage вставлен в ChatPageContent")
PY

grep -n "const sendBotAiMessage\|saveBotAiMessages\|addBotAiMessage\|botAiDraft\|botAiLoading" src/app/chat/page.tsx

npm run build
