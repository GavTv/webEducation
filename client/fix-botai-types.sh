set -e

cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai-types

python3 <<'PY'
from pathlib import Path

path = Path("src/app/chat/page.tsx")
text = path.read_text()

# Добавляем отдельный тип для сообщений botAi на основе актуального UiChatMessage
if "type BotAiMessage = UiChatMessage &" not in text:
    text = text.replace(
        'const BOT_AI_MESSAGES_STORAGE_KEY = "webEducation:botAiMessages";',
        '''const BOT_AI_MESSAGES_STORAGE_KEY = "webEducation:botAiMessages";

type BotAiMessage = UiChatMessage & {
  isError?: boolean;
};'''
    )

# Меняем старый несуществующий ChatMessage на BotAiMessage только для botAi
text = text.replace(
    "const botAiStartMessages: ChatMessage[] = [",
    "const botAiStartMessages: BotAiMessage[] = ["
)

text = text.replace(
    "useState<ChatMessage[]>(botAiStartMessages)",
    "useState<BotAiMessage[]>(botAiStartMessages)"
)

text = text.replace(
    "const parsedMessages = JSON.parse(savedMessages) as ChatMessage[];",
    "const parsedMessages = JSON.parse(savedMessages) as BotAiMessage[];"
)

# Если где-то в botAi коде ещё осталось ChatMessage
text = text.replace(
    "const userMessage: ChatMessage = {",
    "const userMessage: BotAiMessage = {"
)

text = text.replace(
    "const botMessage: ChatMessage = {",
    "const botMessage: BotAiMessage = {"
)

# У BotAiMessage должно быть time, потому что UiChatMessage его требует
text = text.replace(
'''    id: "bot-start",
    author: "@botAi",
    text: "Привет! Я AI-помощник по программированию. Задай вопрос по JavaScript, React, Next.js, Node.js, базам данных или ошибкам.",
    isBot: true,''',
'''    id: "bot-start",
    author: "@botAi",
    text: "Привет! Я AI-помощник по программированию. Задай вопрос по JavaScript, React, Next.js, Node.js, базам данных или ошибкам.",
    time: "сейчас",
    isBot: true,'''
)

path.write_text(text)

print("✅ Типы botAi исправлены")
PY

npm run build
