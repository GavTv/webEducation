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

fs.writeFileSync(`${file}.backup-before-avatar-fix`, text);

if (!text.startsWith('"use client";')) {
  text = `"use client";\n\n${text}`;
}

if (text.includes('from "react"')) {
  text = text.replace(/import\s+\{([^}]+)\}\s+from\s+"react";/, (match, hooks) => {
    const items = hooks
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    for (const hook of ['useEffect', 'useState']) {
      if (!items.includes(hook)) {
        items.push(hook);
      }
    }

    return `import { ${items.join(', ')} } from "react";`;
  });
} else {
  text = text.replace(
    '"use client";',
    '"use client";\n\nimport { useEffect, useState } from "react";',
  );
}

if (!text.includes('useAppSelector')) {
  const lastImport = [...text.matchAll(/^import .*;$/gm)].pop();

  if (lastImport) {
    const index = lastImport.index + lastImport[0].length;

    text =
      text.slice(0, index) +
      '\nimport { useAppSelector } from "@/shared/hooks/useReduxHooks";' +
      text.slice(index);
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

const componentMatch = text.match(/function\s+ChatPageContent\s*\([^)]*\)\s*\{/);

if (!componentMatch) {
  console.log('Не нашёл function ChatPageContent');
  process.exit(1);
}

const componentStart = componentMatch.index + componentMatch[0].length;
const componentBodyStart = text.slice(componentStart, componentStart + 2000);

if (!componentBodyStart.includes('const user = useAppSelector((state) => state.user.user);')) {
  const injected = `
  const user = useAppSelector((state) => state.user.user);
  const userName = user?.name?.trim() || "";
  const firstName = userName.split(/\\s+/)[0] || "";
  const avatarSrc = getAvatarSrc(user?.avatarUrl);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
`;

  text = text.slice(0, componentStart) + injected + text.slice(componentStart);
}

if (!text.includes('const chatGreeting = isMounted')) {
  const marker = `  useEffect(() => {
    setIsMounted(true);
  }, []);`;

  text = text.replace(
    marker,
    `${marker}

  const chatGreeting = isMounted && firstName
    ? \`Привет, \${firstName}! 👋\`
    : "\\u00A0";

  const chatAvatarFallbackLetter = isMounted && firstName
    ? firstName.charAt(0).toUpperCase()
    : "";`,
  );
}

text = text.replace(
  /<h1[^>]*>\s*Привет,\s*\{(?:firstName|safeFirstName)\}!\s*👋\s*<\/h1>/g,
  '<h1 suppressHydrationWarning>{chatGreeting}</h1>',
);

text = text.replace(
  /<h1[^>]*>\s*Привет,\s*Иван!\s*👋\s*<\/h1>/g,
  '<h1 suppressHydrationWarning>{chatGreeting}</h1>',
);

text = text.replace(
  /<h1[^>]*>\s*Привет,\s*Тарас!\s*👋\s*<\/h1>/g,
  '<h1 suppressHydrationWarning>{chatGreeting}</h1>',
);

text = text.replaceAll('{safeFirstName}', '{firstName}');

const topbarRegex = /<header className="topbar">([\s\S]*?)<\/header>/;

text = text.replace(topbarRegex, (headerBlock) => {
  const avatarBlock = `{isMounted && avatarSrc ? (
                <img
                  className="chat-current-user-avatar"
                  src={avatarSrc}
                  alt={firstName || "Пользователь"}
                />
              ) : (
                <div className="chat-current-user-avatar chat-current-user-avatar--empty">
                  {chatAvatarFallbackLetter}
                </div>
              )}`;

  let updated = headerBlock;

  updated = updated.replace(
    /<img\b[^>]*>/,
    avatarBlock,
  );

  return updated;
});

fs.writeFileSync(file, text);

console.log('FIXED src/app/chat/page.tsx');
NODE

cat >> src/app/chat/page.css <<'EOF'

/* Current user avatar in chat topbar */
.topbar .chat-current-user-avatar {
  width: 88px;
  height: 88px;
  min-width: 88px;
  min-height: 88px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  background: #1f2937;
}

.topbar .chat-current-user-avatar--empty {
  display: grid;
  place-items: center;
  color: #ffffff;
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

@media (max-width: 768px) {
  .topbar .chat-current-user-avatar {
    width: 64px;
    height: 64px;
    min-width: 64px;
    min-height: 64px;
  }
}
EOF

rm -rf .next

echo "Готово. Теперь запусти npm run dev"
