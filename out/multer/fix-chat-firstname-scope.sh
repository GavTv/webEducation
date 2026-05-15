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

if (!text.startsWith('"use client";')) {
  text = `"use client";\n\n${text}`;
}

if (!text.includes('useAppSelector')) {
  text = text.replace(
    /("use client";\n\n)/,
    `$1import { useAppSelector } from "@/shared/hooks/useReduxHooks";\n`,
  );
}

if (!text.includes('function getApiOrigin')) {
  const helper = `
function getApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  return raw.replace(/\\/+$/, "").replace(/\\/api$/i, "");
}

function getAvatarSrc(avatarUrl?: string | null) {
  if (!avatarUrl) {
    return "";
  }

  if (avatarUrl.startsWith("http")) {
    return avatarUrl;
  }

  return \`\${getApiOrigin()}\${avatarUrl}\`;
}

`;

  const lastImport = [...text.matchAll(/^import .*;$/gm)].pop();

  if (lastImport) {
    const index = lastImport.index + lastImport[0].length;
    text = `${text.slice(0, index)}\n${helper}${text.slice(index)}`;
  }
}

const contentFunctionRegex = /function ChatPageContent\s*\([^)]*\)\s*\{/;

if (!contentFunctionRegex.test(text)) {
  console.log('Не нашёл function ChatPageContent');
  process.exit(1);
}

text = text.replace(contentFunctionRegex, (match) => {
  if (text.includes('const user = useAppSelector((state) => state.user.user);')) {
    return match;
  }

  return `${match}
  const user = useAppSelector((state) => state.user.user);
  const userName = user?.name?.trim() || "Пользователь";
  const firstName = userName.split(/\\s+/)[0] || "Пользователь";
  const avatarSrc = getAvatarSrc(user?.avatarUrl);
`;
});

text = text.replaceAll('Привет, Иван! 👋', 'Привет, {firstName}! 👋');
text = text.replaceAll('Привет, Иван 👋', 'Привет, {firstName} 👋');
text = text.replaceAll('Добро пожаловать, Иван! 👋', 'Добро пожаловать, {firstName}! 👋');

text = text.replaceAll('<strong>Иван</strong>', '<strong>{firstName}</strong>');
text = text.replaceAll('<span>Иван</span>', '<span>{firstName}</span>');
text = text.replaceAll('<p>Иван</p>', '<p>{firstName}</p>');

text = text.replace(
  /src=\{avatarSrc \|\| "\/avatar\.jpg"\}/g,
  'src={avatarSrc || "/avatar.jpg"}',
);

text = text.replace(
  /<img([^>]*?)src=["']\/avatar\.jpg["']([^>]*?)>/,
  '<img$1src={avatarSrc || "/avatar.jpg"}$2>',
);

text = text.replace(
  /<img([^>]*?)src=["'][^"']*avatar[^"']*["']([^>]*?)>/,
  '<img$1src={avatarSrc || "/avatar.jpg"}$2>',
);

text = text.replaceAll('alt="Иван"', 'alt={firstName}');

fs.writeFileSync(file, text);

console.log('FIXED src/app/chat/page.tsx');
NODE
