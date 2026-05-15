#!/bin/bash

set -e

cd client

echo "========== FIX classes page CSS conflict =========="

node <<'NODE'
const fs = require('fs');

const pageFile = 'src/app/classes/page.tsx';
const cssFile = 'src/app/classes/page.css';

if (fs.existsSync(pageFile)) {
  let text = fs.readFileSync(pageFile, 'utf8');

  text = text.replaceAll('className="profile-card"', 'className="classes-user-card"');
  text = text.replaceAll('className="profile-avatar"', 'className="classes-user-avatar"');

  fs.writeFileSync(pageFile, text);
  console.log('PATCHED src/app/classes/page.tsx');
}

if (fs.existsSync(cssFile)) {
  let text = fs.readFileSync(cssFile, 'utf8');

  text = text.replaceAll('.profile-card', '.classes-user-card');
  text = text.replaceAll('.profile-avatar', '.classes-user-avatar');

  fs.writeFileSync(cssFile, text);
  console.log('PATCHED src/app/classes/page.css');
}
NODE

echo "========== ADD strong profile scoped styles =========="

cat >> src/app/profile/page.css <<'EOF'

/* Fix CSS conflict after navigation from /classes to /profile */
.profile-page .profile-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--app-shell-max-width);
  margin: 0 auto;
  min-width: 0;
  min-height: var(--app-shell-min-height);
  border-radius: var(--app-shell-radius);
  background: rgba(8, 13, 26, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.14);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.45);
  padding: clamp(14px, 2vw, 24px) clamp(20px, 3vw, 48px) clamp(24px, 3.5vw, 56px);
  box-sizing: border-box;
}

.profile-page .profile-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: clamp(16px, 3vw, 28px);
}

.profile-page .avatar-box {
  position: relative;
  display: block;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  cursor: pointer;
}

@media (min-width: 640px) {
  .profile-page .avatar-box {
    width: 140px;
    height: 140px;
  }
}

@media (min-width: 1200px) {
  .profile-page .avatar-box {
    width: 156px;
    height: 156px;
  }
}

.profile-page .avatar-box img,
.profile-page .avatar-placeholder {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 50%;
  object-fit: cover;
  background: #1f2937;
  border: 4px solid rgba(139, 92, 246, 0.46);
  box-sizing: border-box;
}

.profile-page .avatar-placeholder {
  display: grid;
  place-items: center;
  text-align: center;
  padding: 18px;
  color: #a7a7b4;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 700;
}

.profile-page .avatar-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.profile-page .camera-btn {
  position: absolute;
  right: 0;
  bottom: 4px;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid rgba(8, 13, 26, 0.9);
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: #ffffff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  z-index: 3;
  transform: none;
  padding: 0;
}

.profile-page .info-card button {
  pointer-events: auto;
}

@media (max-width: 520px) {
  .profile-page .profile-top {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
}
EOF

echo "========== DONE =========="
echo "Теперь перезапусти client."
