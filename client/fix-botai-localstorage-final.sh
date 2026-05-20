set -e

cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai-localstorage-final

python3 <<'PY'
from pathlib import Path
import re

path = Path("src/app/chat/page.tsx")
text = path.read_text()

# 1. Удаляем старый restore-effect, если он есть
text = re.sub(
    r'\n\s*// restore botAi from localStorage[\s\S]*?\n\s*}, \[\]\);\n',
    '\n',
    text,
    count=1,
)

# 2. Меняем botAiOpen на lazy init из localStorage
text = text.replace(
    '  const [botAiOpen, setBotAiOpen] = useState(false);',
    '''  const [botAiOpen, setBotAiOpen] = useState(() => {
    if (typeof window === "undefined") return false;

    return window.localStorage.getItem(BOT_AI_OPEN_STORAGE_KEY) === "true";
  });'''
)

# 3. Меняем botAiMessages на lazy init из localStorage
text = re.sub(
    r'''  const \[botAiMessages, setBotAiMessages\]\s*=\s*useState<BotAiMessage\[\]>\(botAiStartMessages\);''',
    '''  const [botAiMessages, setBotAiMessages] = useState<BotAiMessage[]>(() => {
    if (typeof window === "undefined") return botAiStartMessages;

    try {
      const savedMessages = window.localStorage.getItem(
        BOT_AI_MESSAGES_STORAGE_KEY,
      );

      if (!savedMessages) return botAiStartMessages;

      const parsedMessages = JSON.parse(savedMessages) as BotAiMessage[];

      if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
        return parsedMessages;
      }

      return botAiStartMessages;
    } catch {
      window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);

      return botAiStartMessages;
    }
  });''',
    text,
    count=1,
)

# 4. Если state был без BotAiMessage, тоже заменим
text = re.sub(
    r'''  const \[botAiMessages, setBotAiMessages\]\s*=\s*useState<[^>]+>\(botAiStartMessages\);''',
    '''  const [botAiMessages, setBotAiMessages] = useState<BotAiMessage[]>(() => {
    if (typeof window === "undefined") return botAiStartMessages;

    try {
      const savedMessages = window.localStorage.getItem(
        BOT_AI_MESSAGES_STORAGE_KEY,
      );

      if (!savedMessages) return botAiStartMessages;

      const parsedMessages = JSON.parse(savedMessages) as BotAiMessage[];

      if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
        return parsedMessages;
      }

      return botAiStartMessages;
    } catch {
      window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);

      return botAiStartMessages;
    }
  });''',
    text,
    count=1,
)

# 5. Удаляем дублирующиеся save-effects по localStorage, чтобы не было каши
text = re.sub(
    r'\n\s*useEffect\(\(\) => \{\s*window\.localStorage\.setItem\(BOT_AI_OPEN_STORAGE_KEY, String\(botAiOpen\)\);\s*\}, \[botAiOpen\]\);\n',
    '\n',
    text,
)

text = re.sub(
    r'\n\s*useEffect\(\(\) => \{\s*window\.localStorage\.setItem\(\s*BOT_AI_MESSAGES_STORAGE_KEY,[\s\S]*?JSON\.stringify\(botAiMessages\),\s*\);\s*\}, \[botAiMessages\]\);\n',
    '\n',
    text,
)

# 6. Добавляем нормальные save-effects сразу после state botAiMessages
marker = '  });'

# Находим конец lazy state botAiMessages
idx = text.find('const [botAiMessages, setBotAiMessages]')
if idx == -1:
    raise SystemExit("❌ Не найден botAiMessages state")

end = text.find('\n  });', idx)
if end == -1:
    raise SystemExit("❌ Не найден конец botAiMessages state")

end = end + len('\n  });')

save_effects = '''

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, String(botAiOpen));
  }, [botAiOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      BOT_AI_MESSAGES_STORAGE_KEY,
      JSON.stringify(botAiMessages),
    );
  }, [botAiMessages]);
'''

if "JSON.stringify(botAiMessages)" not in text[end:end + 800]:
    text = text[:end] + save_effects + text[end:]

# 7. При открытии бота сразу сохраняем open=true
text = text.replace(
    '''  const openBotChat = useCallback(() => {
    setBotAiOpen(true);''',
    '''  const openBotChat = useCallback(() => {
    setBotAiOpen(true);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "true");
    }'''
)

# 8. При выборе обычного чата закрываем окно, но историю НЕ удаляем
text = text.replace(
    '''  const selectRoom = useCallback((id: number) => {
    setBotAiOpen(false);''',
    '''  const selectRoom = useCallback((id: number) => {
    setBotAiOpen(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "false");
    }'''
)

path.write_text(text)

print("✅ localStorage для botAi исправлен")
PY

npm run build
