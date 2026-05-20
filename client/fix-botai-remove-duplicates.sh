set -e

cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-remove-duplicates

python3 <<'PY'
from pathlib import Path

path = Path("src/app/chat/page.tsx")
text = path.read_text()

needle = "  const sendBotAiMessage = useCallback("
starts = []
pos = 0

while True:
    idx = text.find(needle, pos)
    if idx == -1:
        break
    starts.append(idx)
    pos = idx + len(needle)

print(f"Найдено sendBotAiMessage: {len(starts)}")

if len(starts) <= 1:
    print("✅ Дублей нет")
    path.write_text(text)
    raise SystemExit

def find_block_end(source: str, start: int) -> int:
    # Ищем конец блока useCallback: строку "  );"
    marker = "\n  );"
    search_from = start + len(needle)

    while True:
        end = source.find(marker, search_from)
        if end == -1:
            raise RuntimeError("Не смог найти конец блока sendBotAiMessage")

        candidate_end = end + len(marker)

        # После блока обычно пустая строка или return/deps.
        # Берём первый подходящий конец.
        return candidate_end

# Оставляем только первую функцию, все остальные удаляем.
remove_ranges = []

for start in starts[1:]:
    end = find_block_end(text, start)
    remove_ranges.append((start, end))

for start, end in reversed(remove_ranges):
    text = text[:start] + text[end:]

path.write_text(text)

print(f"✅ Удалено дублей: {len(remove_ranges)}")
PY

grep -n "const sendBotAiMessage\|botAiDraft\|botAiLoading" src/app/chat/page.tsx

npm run build
