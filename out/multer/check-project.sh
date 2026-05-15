#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR" || exit 1


echo "========== CHECK PROJECT =========="

if [ ! -d "server" ]; then
  echo "❌ Нет папки server. Запусти: bash out/multer/check-project.sh (из любой папки)"
  exit 1
fi

if [ ! -d "client" ]; then
  echo "❌ Нет папки client. Запусти: bash out/multer/check-project.sh (из любой папки)"
  exit 1
fi

echo ""
echo "========== SERVER: important files =========="
SERVER_FILES=(
  "server/src/App.js"
  "server/src/routes/authRoute.js"
  "server/src/routes/apiRoute.js"
  "server/src/controllers/AuthController.js"
  "server/src/services/AuthService.js"
  "server/src/middleware/uploadAvatar.js"
  "server/src/middleware/verifyAccessToken.js"
  "server/src/middleware/verifyRefreshToken.js"
  "server/src/db/models/user.js"
  "server/.env"
)

for file in "${SERVER_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file отсутствует"
  fi
done

echo ""
echo "========== CLIENT: important files =========="
CLIENT_FILES=(
  "client/src/app/profile/page.tsx"
  "client/src/app/profile/page.css"
  "client/src/app/chat/page.tsx"
  "client/src/app/chat/page.css"
  "client/src/app/classes/page.tsx"
  "client/src/entities/user/api/UserApiThunk.ts"
  "client/src/entities/user/slice/userSlice.ts"
  "client/src/entities/user/model/index.ts"
  "client/src/shared/hooks/useReduxHooks.ts"
  "client/.env.local"
)

for file in "${CLIENT_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file отсутствует"
  fi
done

echo ""
echo "========== SERVER: DB config =========="
cd server

node <<'NODE'
try {
  process.loadEnvFile('.env');

  const dbUrl = process.env.DB || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.log('❌ DB или DATABASE_URL не найдены в server/.env');
    process.exit(0);
  }

  const parsed = new URL(dbUrl);

  console.log('✅ DB HOST:', parsed.hostname);
  console.log('✅ DB PORT:', parsed.port);
  console.log('✅ DB USER:', parsed.username);
  console.log('✅ DB NAME:', parsed.pathname.slice(1));
} catch (error) {
  console.log('❌ Ошибка чтения DB url:', error.message);
}
NODE

echo ""
echo "========== SERVER: grep possible bugs =========="

echo ""
echo "--- uploadAvatar.single ---"
grep -R "uploadAvatar.single" src || echo "✅ uploadAvatar.single не найден"

echo ""
echo "--- cookieConfig ---"
grep -R "cookieConfig" src || echo "✅ cookieConfig не найден"

echo ""
echo "--- PATCH /me route ---"
grep -R "patch('/me" src/routes || grep -R 'patch("/me' src/routes || echo "❌ PATCH /me не найден"

echo ""
echo "--- static uploads ---"
grep -R "express.static.*uploads" src || echo "❌ Раздача /uploads не найдена"

echo ""
echo "--- avatarUrl in server ---"
grep -R "avatarUrl" src/db src/controllers src/services src/middleware | head -30 || echo "❌ avatarUrl не найден на сервере"

echo ""
echo "========== SERVER: syntax check =========="
node -c src/App.js
node -c src/controllers/AuthController.js
node -c src/routes/authRoute.js
node -c src/services/AuthService.js
node -c src/middleware/uploadAvatar.js

cd ../client

echo ""
echo "========== CLIENT: env =========="
if [ -f ".env.local" ]; then
  cat .env.local
else
  echo "❌ client/.env.local отсутствует"
fi

echo ""
echo "========== CLIENT: grep possible bugs =========="

echo ""
echo "--- firstName bugs ---"
grep -R "Привет, {firstName}" src/app || echo "✅ Привет, {firstName} не найден"
grep -R "safeFirstName" src/app || echo "✅ safeFirstName не найден"

echo ""
echo "--- Иван hardcode ---"
grep -R "Иван" src/app || echo "✅ Иван hardcode не найден"

echo ""
echo "--- old avatar paths ---"
grep -R "educhat-avatar\|avatar.jpg" src/app/chat src/app/profile src/app/classes || echo "✅ old avatar paths не найдены"

echo ""
echo "--- profile-card conflicts ---"
grep -R "className=\"profile-card\"" src/app/classes src/app/chat 2>/dev/null || echo "✅ profile-card вне профиля не найден"

echo ""
echo "--- avatarUrl in client ---"
grep -R "avatarUrl" src/app src/entities | head -40 || echo "❌ avatarUrl не найден на клиенте"

echo ""
echo "========== CLIENT: lint/build check =========="
npm run lint || true
npm run build || true

echo ""
echo "========== DONE =========="
echo "Скинь сюда весь вывод, где есть ❌ или Error."
