set -e

cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai-hydration

python3 <<'PY'
from pathlib import Path
import re

path = Path("src/app/chat/page.tsx")
text = path.read_text()

# 1. Добавляем useRef в импорт, если вдруг его нет
text = text.replace(
    "useEffect,\n  useMemo,\n  useState,",
    "useEffect,\n  useMemo,\n  useRef,\n  useState,"
)

# 2. Убираем lazy init botAiOpen из localStorage
text = re.sub(
    r'''  const \[botAiOpen, setBotAiOpen\] = useState\(\(\) => \{\s*if \(typeof window === "undefined"\) return false;\s*return window\.localStorage\.getItem\(BOT_AI_OPEN_STORAGE_KEY\) === "true";\s*\}\);''',
    '''  const [botAiOpen, setBotAiOpen] = useState(false);''',
    text,
    count=1,
)

# 3. Убираем lazy init botAiMessages из localStorage
text = re.sub(
    r'''  const \[botAiMessages, setBotAiMessages\] = useState<BotAiMessage\[\]>\(\(\) => \{[\s\S]*?return botAiStartMessages;\s*\}\s*\);''',
    '''  const [botAiMessages, setBotAiMessages] =
    useState<BotAiMessage[]>(botAiStartMessages);''',
    text,
    count=1,
)

# 4. Добавляем флаг восстановления после botAiMessages state
if "botAiStorageReadyRef" not in text:
    text = text.replace(
        '''  const [botAiMessages, setBotAiMessages] =
    useState<BotAiMessage[]>(botAiStartMessages);''',
        '''  const [botAiMessages, setBotAiMessages] =
    useState<BotAiMessage[]>(botAiStartMessages);

  const botAiStorageReadyRef = useRef(false);'''
    )

# 5. Удаляем старые эффекты сохранения, если они уже есть
text = re.sub(
    r'''\n\s*useEffect\(\(\) => \{\s*if \(typeof window === "undefined"\) return;\s*window\.localStorage\.setItem\(BOT_AI_OPEN_STORAGE_KEY, String\(botAiOpen\)\);\s*\}, \[botAiOpen\]\);\n''',
    "\n",
    text,
)

text = re.sub(
    r'''\n\s*useEffect\(\(\) => \{\s*if \(typeof window === "undefined"\) return;\s*window\.localStorage\.setItem\(\s*BOT_AI_MESSAGES_STORAGE_KEY,\s*JSON\.stringify\(botAiMessages\),\s*\);\s*\}, \[botAiMessages\]\);\n''',
    "\n",
    text,
)

# 6. Вставляем корректное восстановление + сохранение после ref
if "hydrate botAi from localStorage without SSR mismatch" not in text:
    restore_block = '''
  // hydrate botAi from localStorage without SSR mismatch
  useEffect(() => {
    try {
      const savedOpen = window.localStorage.getItem(BOT_AI_OPEN_STORAGE_KEY);
      const savedMessages = window.localStorage.getItem(
        BOT_AI_MESSAGES_STORAGE_KEY,
      );

      if (savedOpen === "true") {
        setBotAiOpen(true);

        if (window.matchMedia(MOBILE_BP).matches) {
          setMobileThreadOpen(true);
        }
      }

      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages) as BotAiMessage[];

        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setBotAiMessages(parsedMessages);
        }
      }
    } catch {
      window.localStorage.removeItem(BOT_AI_OPEN_STORAGE_KEY);
      window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);
    } finally {
      botAiStorageReadyRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!botAiStorageReadyRef.current) return;

    window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, String(botAiOpen));
  }, [botAiOpen]);

  useEffect(() => {
    if (!botAiStorageReadyRef.current) return;

    window.localStorage.setItem(
      BOT_AI_MESSAGES_STORAGE_KEY,
      JSON.stringify(botAiMessages),
    );
  }, [botAiMessages]);
'''
    text = text.replace(
        "  const botAiStorageReadyRef = useRef(false);",
        "  const botAiStorageReadyRef = useRef(false);" + restore_block,
        1,
    )

path.write_text(text)
print("✅ Hydration fix для botAi добавлен")
PY

npm run build
