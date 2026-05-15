#!/bin/bash

set -e

cd client

node <<'NODE'
const fs = require('fs');
const path = require('path');

function walk(dir, result = []) {
  if (!fs.existsSync(dir)) {
    return result;
  }

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      walk(full, result);
    } else if (/\.(tsx|ts)$/.test(full)) {
      result.push(full);
    }
  }

  return result;
}

const files = walk('src/app');

const targetFile =
  files.find((file) => {
    const text = fs.readFileSync(file, 'utf8');
    return text.includes('Привет, Иван') || text.includes('Добро пожаловать, Иван');
  }) ||
  files.find((file) => {
    const text = fs.readFileSync(file, 'utf8');
    return file.includes('chat') && text.includes('Иван');
  });

if (!targetFile) {
  console.log('Не нашёл страницу чатов. Проверь файл вручную: src/app/chats/page.tsx или src/app/chat/page.tsx');
  process.exit(1);
}

console.log('PATCH FILE:', targetFile);

let text = fs.readFileSync(targetFile, 'utf8');

if (!text.startsWith('"use client";')) {
  text = `"use client";\n\n${text}`;
}

if (!text.includes('useAppSelector')) {
  text = text.replace(
    /import\s+([^;]+)\s+from\s+["']next\/link["'];/,
    (match) => `${match}\nimport { useAppSelector } from "@/shared/hooks/useReduxHooks";`,
  );

  if (!text.includes('useAppSelector')) {
    text = text.replace(
      /("use client";\n\n)/,
      `$1import { useAppSelector } from "@/shared/hooks/useReduxHooks";\n`,
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

  const lastImportMatch = [...text.matchAll(/^import .*;$/gm)].pop();

  if (lastImportMatch) {
    const index = lastImportMatch.index + lastImportMatch[0].length;
    text = `${text.slice(0, index)}\n${helper}${text.slice(index)}`;
  } else {
    text = text.replace('"use client";\n\n', `"use client";\n\n${helper}`);
  }
}

const componentMatch = text.match(/export default function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/);

if (!componentMatch) {
  console.log('Не нашёл export default function в странице чатов');
  process.exit(1);
}

const componentStart = componentMatch.index + componentMatch[0].length;

if (!text.includes('const user = useAppSelector((state) => state.user.user);')) {
  const inject = `
  const user = useAppSelector((state) => state.user.user);
  const userName = user?.name?.trim() || "Пользователь";
  const firstName = userName.split(/\\s+/)[0] || "Пользователь";
  const avatarSrc = getAvatarSrc(user?.avatarUrl);
`;
  text = `${text.slice(0, componentStart)}${inject}${text.slice(componentStart)}`;
}

text = text.replaceAll('Привет, Иван! 👋', 'Привет, {firstName}! 👋');
text = text.replaceAll('Привет, Иван 👋', 'Привет, {firstName} 👋');
text = text.replaceAll('Добро пожаловать, Иван! 👋', 'Добро пожаловать, {firstName}! 👋');

text = text.replaceAll('<strong>Иван</strong>', '<strong>{firstName}</strong>');
text = text.replaceAll('<span>Иван</span>', '<span>{firstName}</span>');
text = text.replaceAll('<p>Иван</p>', '<p>{firstName}</p>');

// если справа была статичная картинка профиля — меняем src на avatarSrc
text = text.replace(
  /<img([^>]*?)src=["']\/avatar\.jpg["']([^>]*?)>/,
  '<img$1src={avatarSrc || "/avatar.jpg"}$2>',
);

text = text.replace(
  /<img([^>]*?)src=["']\/educhat-avatar\.jpg["']([^>]*?)>/,
  '<img$1src={avatarSrc || "/avatar.jpg"}$2>',
);

text = text.replace(
  /<img([^>]*?)src=["'][^"']*avatar[^"']*["']([^>]*?)>/,
  '<img$1src={avatarSrc || "/avatar.jpg"}$2>',
);

text = text.replace(
  /alt=["']Иван["']/g,
  'alt={firstName}',
);

fs.writeFileSync(targetFile, text);

console.log('DONE: имя и фото пользователя подключены на странице чатов');
NODE

echo "Готово. Перезапусти client."
