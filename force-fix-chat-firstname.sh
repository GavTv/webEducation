#!/bin/bash

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
  const lastImport = [...text.matchAll(/^import .*;$/gm)].pop();

  if (lastImport) {
    const index = lastImport.index + lastImport[0].length;
    text =
      text.slice(0, index) +
      '\nimport { useAppSelector } from "@/shared/hooks/useReduxHooks";' +
      text.slice(index);
  } else {
    text = text.replace(
      '"use client";\n\n',
      '"use client";\n\nimport { useAppSelector } from "@/shared/hooks/useReduxHooks";\n',
    );
  }
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
    text = text.slice(0, index) + "\n" + helper + text.slice(index);
  }
}

const match = text.match(/function\s+ChatPageContent\s*\([^)]*\)\s*\{/);

if (!match) {
  console.log('Не нашёл function ChatPageContent(...)');
  process.exit(1);
}

const insertIndex = match.index + match[0].length;

const nextPart = text.slice(insertIndex, insertIndex + 1200);

if (!nextPart.includes('const firstName =')) {
  const injected = `
  const user = useAppSelector((state) => state.user.user);
  const userName = user?.name?.trim() || "Пользователь";
  const firstName = userName.split(/\\s+/)[0] || "Пользователь";
  const avatarSrc = getAvatarSrc(user?.avatarUrl);
`;

  text = text.slice(0, insertIndex) + injected + text.slice(insertIndex);
}

text = text.replaceAll('Привет, Иван! 👋', 'Привет, {firstName}! 👋');
text = text.replaceAll('Привет, Иван 👋', 'Привет, {firstName} 👋');
text = text.replaceAll('Добро пожаловать, Иван! 👋', 'Добро пожаловать, {firstName}! 👋');

text = text.replaceAll('<strong>Иван</strong>', '<strong>{firstName}</strong>');
text = text.replaceAll('<span>Иван</span>', '<span>{firstName}</span>');

text = text.replace(
  /<img([^>]*?)src=["']\/avatar\.jpg["']([^>]*?)>/g,
  '<img$1src={avatarSrc || "/avatar.jpg"}$2>',
);

text = text.replace(
  /<img([^>]*?)src=["'][^"']*avatar[^"']*["']([^>]*?)>/g,
  '<img$1src={avatarSrc || "/avatar.jpg"}$2>',
);

text = text.replaceAll('alt="Иван"', 'alt={firstName}');

fs.writeFileSync(file, text);

console.log('FIXED: firstName добавлен внутрь ChatPageContent');
NODE
