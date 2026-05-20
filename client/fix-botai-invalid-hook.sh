set -e

cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-invalid-hook

python3 <<'PY'
from pathlib import Path

path = Path("src/app/chat/page.tsx")
text = path.read_text()

def remove_usecallback_const(source: str, name: str) -> str:
    while True:
        idx = source.find(f"const {name} = useCallback(")
        if idx == -1:
            return source

        # начало строки
        start = source.rfind("\n", 0, idx)
        if start == -1:
            start = 0
        else:
            start += 1

        open_paren = source.find("(", idx)
        depth = 0
        end = None

        i = open_paren
        while i < len(source):
            ch = source[i]

            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1

                if depth == 0:
                    semi = source.find(";", i)
                    if semi != -1:
                        end = semi + 1
                    break

            i += 1

        if end is None:
            raise SystemExit(f"❌ Не смог удалить блок {name}")

        # удалить ещё перевод строки после блока
        if end < len(source) and source[end] == "\n":
            end += 1

        source = source[:start] + source[end:]


for name in ["saveBotAiMessages", "addBotAiMessage", "sendBotAiMessage"]:
    text = remove_usecallback_const(text, name)

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

func = "function ChatPageContent()"
func_idx = text.find(func)

if func_idx == -1:
    raise SystemExit("❌ Не найден function ChatPageContent")

brace_idx = text.find("{", func_idx)

if brace_idx == -1:
    raise SystemExit("❌ Не найдена открывающая скобка ChatPageContent")

depth = 0
insert_idx = -1
i = brace_idx

while i < len(text):
    ch = text[i]

    if ch == "{":
        depth += 1
    elif ch == "}":
        depth -= 1

    if depth == 1 and text.startswith("  return (", i):
        insert_idx = i
        break

    i += 1

if insert_idx == -1:
    raise SystemExit("❌ Не найден главный return внутри ChatPageContent")

text = text[:insert_idx] + bot_block + text[insert_idx:]

path.write_text(text)

print("✅ Хуки botAi вынесены на уровень компонента")
PY

grep -n "const saveBotAiMessages\|const addBotAiMessage\|const sendBotAiMessage" src/app/chat/page.tsx

npm run build
