set -e

echo "📦 Backup..."
cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai-refresh-persist

python3 <<'PY'
from pathlib import Path
import re
import sys

path = Path("src/app/chat/page.tsx")
text = path.read_text()

# 1. Добавляем ключи localStorage, если их нет
if "BOT_AI_OPEN_STORAGE_KEY" not in text:
    text = text.replace(
        'const MOBILE_BP = "(max-width: 900px)";',
        '''const MOBILE_BP = "(max-width: 900px)";
const BOT_AI_OPEN_STORAGE_KEY = "webEducation:botAiOpen";
const BOT_AI_MESSAGES_STORAGE_KEY = "webEducation:botAiMessages";'''
    )

if "BOT_AI_MESSAGES_STORAGE_KEY" not in text:
    text = text.replace(
        'const BOT_AI_OPEN_STORAGE_KEY = "webEducation:botAiOpen";',
        '''const BOT_AI_OPEN_STORAGE_KEY = "webEducation:botAiOpen";
const BOT_AI_MESSAGES_STORAGE_KEY = "webEducation:botAiMessages";'''
    )

# 2. Находим state botAiMessages
pattern = re.compile(
    r'(  const \[botAiMessages, setBotAiMessages\]\s*=\s*useState<[^>]+>\(botAiStartMessages\);)',
    re.MULTILINE,
)

match = pattern.search(text)

if not match:
    sys.exit("❌ Не найден state botAiMessages. Пришли grep -n \"botAiMessages\" src/app/chat/page.tsx")

# 3. Вставляем restore/save эффекты только один раз
if "restore botAi from localStorage" not in text:
    effects = '''
  // restore botAi from localStorage
  useEffect(() => {
    try {
      const savedOpen = window.localStorage.getItem(BOT_AI_OPEN_STORAGE_KEY);
      const savedMessages = window.localStorage.getItem(
        BOT_AI_MESSAGES_STORAGE_KEY,
      );

      if (savedOpen === "true") {
        setBotAiOpen(true);

        if (
          typeof window !== "undefined" &&
          window.matchMedia(MOBILE_BP).matches
        ) {
          setMobileThreadOpen(true);
        }
      }

      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);

        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setBotAiMessages(parsedMessages);
        }
      }
    } catch {
      window.localStorage.removeItem(BOT_AI_OPEN_STORAGE_KEY);
      window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, String(botAiOpen));
  }, [botAiOpen]);

  useEffect(() => {
    window.localStorage.setItem(
      BOT_AI_MESSAGES_STORAGE_KEY,
      JSON.stringify(botAiMessages),
    );
  }, [botAiMessages]);
'''
    text = text[:match.end()] + "\n" + effects + text[match.end():]

# 4. При открытии botAi сразу сохраняем флаг
text = text.replace(
    '''  const openBotChat = useCallback(() => {
    setBotAiOpen(true);''',
    '''  const openBotChat = useCallback(() => {
    setBotAiOpen(true);
    window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "true");'''
)

# 5. При выборе обычного чата закрываем botAi и сохраняем это
text = text.replace(
    '''  const selectRoom = useCallback((id: number) => {
    setBotAiOpen(false);''',
    '''  const selectRoom = useCallback((id: number) => {
    setBotAiOpen(false);
    window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "false");'''
)

# 6. Кнопка очистки должна чистить историю, но не закрывать чат
if "clearBotAiChat" in text:
    text = text.replace(
        '''    setBotAiMessages(botAiStartMessages);
    window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);''',
        '''    setBotAiMessages(botAiStartMessages);
    window.localStorage.setItem(
      BOT_AI_MESSAGES_STORAGE_KEY,
      JSON.stringify(botAiStartMessages),
    );'''
    )

path.write_text(text)

print("✅ Сохранение botAi после refresh добавлено")
PY

npm run build
