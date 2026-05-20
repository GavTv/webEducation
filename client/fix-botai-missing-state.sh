set -e

cp src/app/chat/page.tsx src/app/chat/page.tsx.backup-botai-missing-state

python3 <<'PY'
from pathlib import Path
import re
import sys

path = Path("src/app/chat/page.tsx")
text = path.read_text()

# 1. Добавляем botAiDraft и botAiLoading после обычного draft
if "const [botAiDraft, setBotAiDraft]" not in text:
    text, count = re.subn(
        r'(const\s+\[draft,\s*setDraft\]\s*=\s*useState\(""\);)',
        r'''\1
  const [botAiDraft, setBotAiDraft] = useState("");
  const [botAiLoading, setBotAiLoading] = useState(false);''',
        text,
        count=1,
    )

    if count == 0:
        sys.exit("❌ Не нашёл const [draft, setDraft]")

# 2. Если botAiLoading вдруг есть, а botAiDraft нет
if "const [botAiDraft, setBotAiDraft]" not in text:
    sys.exit("❌ botAiDraft не добавился")

# 3. Если botAiOpen нет — добавляем тоже
if "const [botAiOpen, setBotAiOpen]" not in text:
    text, count = re.subn(
        r'(const\s+\[mobileThreadOpen,\s*setMobileThreadOpen\]\s*=\s*useState\(false\);)',
        r'''\1
  const [botAiOpen, setBotAiOpen] = useState(false);''',
        text,
        count=1,
    )

    if count == 0:
        sys.exit("❌ Не нашёл mobileThreadOpen")

path.write_text(text)
print("✅ Добавлены недостающие state для botAi")
PY

npm run build
