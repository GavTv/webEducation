#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR" || exit 1


set -e

cd client

node <<'NODE'
const fs = require('fs');

const file = 'src/app/chat/page.tsx';

if (!fs.existsSync(file)) {
  console.log('Не найден src/app/chat/page.tsx');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

/**
 * 1. Добавляем useEffect/useState в import из react
 */
if (text.includes('from "react"')) {
  text = text.replace(/import\s+\{([^}]+)\}\s+from\s+"react";/, (match, hooks) => {
    const list = hooks
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    for (const hook of ['useEffect', 'useState']) {
      if (!list.includes(hook)) {
        list.push(hook);
      }
    }

    return `import { ${list.join(', ')} } from "react";`;
  });
} else {
  text = text.replace(
    '"use client";',
    '"use client";\n\nimport { useEffect, useState } from "react";',
  );
}

/**
 * 2. Добавляем safeFirstName/safeAvatarSrc внутрь ChatPageContent
 * Смысл: на сервере и на первом клиентском рендере будет одинаково "Пользователь",
 * а настоящее имя появится после useEffect.
 */
if (!text.includes('const safeFirstName = isMounted ? firstName : "Пользователь";')) {
  const marker = `  const avatarSrc = getAvatarSrc(user?.avatarUrl);`;

  if (text.includes(marker)) {
    text = text.replace(
      marker,
      `${marker}
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const safeFirstName = isMounted ? firstName : "Пользователь";
  const safeAvatarSrc = isMounted ? avatarSrc : "";`,
    );
  } else {
    const firstNameMarker = `  const firstName = userName.split(/\\s+/)[0] || "Пользователь";`;

    text = text.replace(
      firstNameMarker,
      `${firstNameMarker}
  const avatarSrc = getAvatarSrc(user?.avatarUrl);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const safeFirstName = isMounted ? firstName : "Пользователь";
  const safeAvatarSrc = isMounted ? avatarSrc : "";`,
    );
  }
}

/**
 * 3. Меняем отображение имени на safeFirstName
 */
text = text.replaceAll('{firstName}', '{safeFirstName}');

/**
 * 4. Меняем аватар на safeAvatarSrc
 */
text = text.replaceAll(
  'src={avatarSrc || "/avatar.jpg"}',
  'src={safeAvatarSrc || "/avatar.jpg"}',
);

text = text.replaceAll(
  'src={avatarSrc || "/educhat-avatar.jpg"}',
  'src={safeAvatarSrc || "/avatar.jpg"}',
);

text = text.replace(
  /<img([^>]*?)src=["']\/avatar\.jpg["']([^>]*?)>/g,
  '<img$1src={safeAvatarSrc || "/avatar.jpg"}$2>',
);

text = text.replace(
  /<img([^>]*?)src=["']\/educhat-avatar\.jpg["']([^>]*?)>/g,
  '<img$1src={safeAvatarSrc || "/avatar.jpg"}$2>',
);

/**
 * 5. Если справа был статичный путь к картинке профиля, тоже подменяем
 */
text = text.replace(
  /<img([^>]*?)src=["'][^"']*(profile|avatar|user)[^"']*\.(png|jpg|jpeg|webp)["']([^>]*?)>/g,
  '<img$1src={safeAvatarSrc || "/avatar.jpg"}$4>',
);

text = text.replaceAll('alt={firstName}', 'alt={safeFirstName}');
text = text.replaceAll('alt="Иван"', 'alt={safeFirstName}');

fs.writeFileSync(file, text);

console.log('FIXED src/app/chat/page.tsx');
NODE

echo "Теперь очищаем кэш Next"
rm -rf .next

echo "Готово. Запусти npm run dev"
