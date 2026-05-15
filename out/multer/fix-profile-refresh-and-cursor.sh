#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR" || exit 1


set -e

echo "========== SERVER: fix refresh user from DB =========="
cd server

node <<'NODE'
const fs = require('fs');

const file = 'src/controllers/AuthController.js';

if (!fs.existsSync(file)) {
  console.log('AuthController.js не найден');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

/**
 * 1. Чиним refreshTokens:
 * было: берём user из res.locals.user, который пришёл из refreshToken
 * надо: по user.id сходить в DB и вернуть свежие данные
 */
const refreshRegex = /static async refreshTokens\(req, res\) \{[\s\S]*?\n  \}/;

const refreshMethod = `static async refreshTokens(req, res) {
    try {
      const tokenUser = res.locals.user;

      if (!tokenUser?.id) {
        return res
          .status(401)
          .json(formatResponse(401, 'Пользователь не авторизован'));
      }

      const user = await AuthService.findPublicUserById(tokenUser.id);

      if (!user) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пользователь не найден'));
      }

      const { accessToken, refreshToken } = generateTokens({ user });

      return res
        .status(200)
        .cookie('refreshToken', refreshToken, cookieConfig)
        .json(
          formatResponse(200, 'Пользовательская сессия продлена', {
            user,
            accessToken,
          }),
        );
    } catch (error) {
      console.log('======== AuthController.refreshTokens =========');
      console.log(error);

      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при обновлении токена'));
    }
  }`;

if (refreshRegex.test(text)) {
  text = text.replace(refreshRegex, refreshMethod);
  console.log('PATCHED refreshTokens');
} else {
  console.log('refreshTokens не найден — пропускаю');
}

/**
 * 2. Чиним updateProfile:
 * после сохранения профиля нужно обновить и accessToken, и refreshToken.
 * Иначе после F5 refreshToken может вернуть старые данные.
 */
text = text.replace(
  /const \{ accessToken \} = generateTokens\(\{ user \}\);/g,
  'const { accessToken, refreshToken } = generateTokens({ user });',
);

text = text.replace(
  /return res\.status\(200\)\.json\(\s*formatResponse\(200, 'Профиль обновлён', \{\s*user,\s*accessToken,\s*\}\),\s*\);/g,
  `return res
        .status(200)
        .cookie('refreshToken', refreshToken, cookieConfig)
        .json(
          formatResponse(200, 'Профиль обновлён', {
            user,
            accessToken,
          }),
        );`,
);

fs.writeFileSync(file, text);

console.log('DONE server AuthController patch');
NODE

echo "========== CLIENT: fix pencil cursor =========="
cd ../client

node <<'NODE'
const fs = require('fs');

const file = 'src/app/profile/page.tsx';

if (!fs.existsSync(file)) {
  console.log('profile page не найден');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

text = text.replace(
`  const handleEnableFirstNameEdit = useCallback(() => {
    setIsFirstNameEditable(true);

    setTimeout(() => {
      firstNameInputRef.current?.focus();
      firstNameInputRef.current?.select();
    }, 0);
  }, []);

  const handleEnableLastNameEdit = useCallback(() => {
    setIsLastNameEditable(true);

    setTimeout(() => {
      lastNameInputRef.current?.focus();
      lastNameInputRef.current?.select();
    }, 0);
  }, []);`,
`  const handleEnableFirstNameEdit = useCallback(() => {
    setIsFirstNameEditable(true);

    setTimeout(() => {
      const input = firstNameInputRef.current;

      if (!input) {
        return;
      }

      const end = input.value.length;

      input.focus();
      input.setSelectionRange(end, end);
    }, 0);
  }, []);

  const handleEnableLastNameEdit = useCallback(() => {
    setIsLastNameEditable(true);

    setTimeout(() => {
      const input = lastNameInputRef.current;

      if (!input) {
        return;
      }

      const end = input.value.length;

      input.focus();
      input.setSelectionRange(end, end);
    }, 0);
  }, []);`,
);

fs.writeFileSync(file, text);

console.log('DONE client cursor patch');
NODE

echo "========== DONE =========="
echo "Перезапусти server и client."
