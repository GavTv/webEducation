set -e

echo "📦 Делаю backup..."
cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai-persist

echo "💾 Добавляю сохранение botAi в localStorage..."

python3 <<'PY'
from pathlib import Path
import sys

path = Path("src/app/chat/page.tsx")
s = path.read_text()

# 1. Добавляем ключи localStorage после MOBILE_BP
if "BOT_AI_MESSAGES_STORAGE_KEY" not in s:
    s = s.replace(
        'const MOBILE_BP = "(max-width: 900px)";',
        '''const MOBILE_BP = "(max-width: 900px)";
const BOT_AI_OPEN_STORAGE_KEY = "webEducation:botAiOpen";
const BOT_AI_MESSAGES_STORAGE_KEY = "webEducation:botAiMessages";'''
    )

# 2. Добавляем восстановление состояния после объявления botAiMessages
target = '''  const [botAiMessages, setBotAiMessages] =
    useState<ChatMessage[]>(botAiStartMessages);'''

insert = '''  const [botAiMessages, setBotAiMessages] =
    useState<ChatMessage[]>(botAiStartMessages);

  useEffect(() => {
    try {
      const savedOpen = window.localStorage.getItem(BOT_AI_OPEN_STORAGE_KEY);
      const savedMessages = window.localStorage.getItem(
        BOT_AI_MESSAGES_STORAGE_KEY,
      );

      if (savedOpen === "true") {
        setBotAiOpen(true);
      }

      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages) as ChatMessage[];

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
  }, [botAiMessages]);'''

if insert not in s:
    if target not in s:
        sys.exit("❌ Не найден блок botAiMessages в page.tsx")
    s = s.replace(target, insert)

# 3. Когда выбираем обычный чат, botAi закрывается и localStorage тоже обновится через useEffect.
# 4. Добавляем кнопку очистки истории в header botAi, чтобы можно было сбросить переписку.
if "clearBotAiChat" not in s:
    target = '''  const openBotChat = useCallback(() => {
    setBotAiOpen(true);

    if (typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches) {
      setMobileThreadOpen(true);
    }
  }, []);'''

    insert = '''  const openBotChat = useCallback(() => {
    setBotAiOpen(true);

    if (typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches) {
      setMobileThreadOpen(true);
    }
  }, []);

  const clearBotAiChat = useCallback(() => {
    setBotAiMessages(botAiStartMessages);
    window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);
  }, []);'''

    if target not in s:
        sys.exit("❌ Не найден openBotChat в page.tsx")
    s = s.replace(target, insert)

# 5. Вставляем маленькую кнопку очистки только в botAi header
old_header = '''              <span>{botAiOpen ? "🤖" : selected?.icon ?? "#"}</span>'''

new_header = '''              {botAiOpen ? (
                <button
                  type="button"
                  className="bot-clear-button"
                  onClick={clearBotAiChat}
                >
                  Очистить
                </button>
              ) : (
                <span>{selected?.icon ?? "#"}</span>
              )}'''

if 'className="bot-clear-button"' not in s:
    if old_header not in s:
        sys.exit("❌ Не найден icon span в preview-header")
    s = s.replace(old_header, new_header)

path.write_text(s)
print("✅ page.tsx обновлён")
PY

echo "🎨 Добавляю CSS для кнопки очистки..."

cat >> src/app/chat/page.css <<'EOF'

.bot-clear-button {
  border: 0;
  border-radius: 14px;
  padding: 10px 14px;
  color: #ffffff;
  background: rgba(139, 92, 246, 0.18);
  font-weight: 800;
  cursor: pointer;
}

.bot-clear-button:hover {
  background: rgba(139, 92, 246, 0.28);
}
EOF

echo "✅ Проверяю сборку..."
npm run build

echo "✅ Готово"
