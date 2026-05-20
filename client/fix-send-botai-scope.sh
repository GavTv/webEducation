set -e

cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-send-botai-scope

python3 <<'PY'
from pathlib import Path
import re

path = Path("src/app/chat/page.tsx")
text = path.read_text()

# Удаляем все существующие кривые копии sendBotAiMessage
pattern = re.compile(
    r'\n\s*const sendBotAiMessage = useCallback\([\s\S]*?\n\s*\);\n',
    re.MULTILINE,
)

text, count = pattern.subn("\n", text)

print(f"Удалено старых sendBotAiMessage: {count}")

# Вставляем одну правильную функцию перед главным return компонента
bot_func = '''
  const sendBotAiMessage = useCallback(
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

marker = '\n  return (\n    <main'

if marker not in text:
    raise SystemExit("❌ Не найден главный return компонента")

text = text.replace(marker, "\n" + bot_func + "  return (\n    <main", 1)

path.write_text(text)

print("✅ sendBotAiMessage вставлен в правильное место")
PY

grep -n "const sendBotAiMessage\|botAiDraft\|botAiLoading" src/app/chat/page.tsx

npm run build
