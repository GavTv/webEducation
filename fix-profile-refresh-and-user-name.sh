#!/bin/bash

set -e

echo "========== SERVER: refresh берет свежего user из DB =========="
cd server

node <<'NODE'
const fs = require('fs');

const file = 'src/controllers/AuthController.js';

if (!fs.existsSync(file)) {
  console.log('Не найден src/controllers/AuthController.js');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

const refreshMethodRegex = /  static async refreshTokens\(req, res\) \{[\s\S]*?\n  \}/;

const newRefreshMethod = `  static async refreshTokens(req, res) {
    const tokenUser = res.locals.user;

    try {
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

if (refreshMethodRegex.test(text)) {
  text = text.replace(refreshMethodRegex, newRefreshMethod);
  console.log('PATCHED refreshTokens');
} else {
  console.log('Метод refreshTokens не найден');
}

if (!text.includes('findPublicUserById') && text.includes('AuthService.findPublicUserById')) {
  console.log('Проверь AuthService: нужен метод findPublicUserById');
}

fs.writeFileSync(file, text);
NODE

echo "========== SERVER: проверяем AuthService methods =========="
node <<'NODE'
const fs = require('fs');

const file = 'src/services/AuthService.js';

if (!fs.existsSync(file)) {
  console.log('Не найден src/services/AuthService.js');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

if (!text.includes('static async findPublicUserById')) {
  const methods = `
  static async findPublicUserById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    return user ? user.get() : null;
  }

  static async updateUserProfileById(id, profileData) {
    await User.update(profileData, { where: { id } });

    return this.findPublicUserById(id);
  }

`;

  text = text.replace(
    '\n}\n\nmodule.exports = AuthService;',
    `${methods}\n}\n\nmodule.exports = AuthService;`,
  );

  fs.writeFileSync(file, text);
  console.log('PATCHED AuthService methods');
} else {
  console.log('OK AuthService methods');
}
NODE

echo "========== CLIENT: profile не выкидывает до проверки refresh =========="
cd ../client

node <<'NODE'
const fs = require('fs');

const file = 'src/app/profile/page.tsx';

if (!fs.existsSync(file)) {
  console.log('Не найден src/app/profile/page.tsx');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

if (!text.includes('refreshTokenThunk')) {
  text = text.replace(
    `  deleteAccountThunk,
  logoutThunk,`,
    `  deleteAccountThunk,
  logoutThunk,
  refreshTokenThunk,`,
  );
}

if (!text.includes('const [authChecked, setAuthChecked]')) {
  text = text.replace(
    `  const [successMessage, setSuccessMessage] = useState("");`,
    `  const [successMessage, setSuccessMessage] = useState("");
  const [authChecked, setAuthChecked] = useState(false);`,
  );
}

const oldRedirectEffect = `  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/");
    }
  }, [isInitialized, user, router]);`;

const newRedirectEffect = `  useEffect(() => {
    if (user) {
      setAuthChecked(true);
      return;
    }

    if (!isInitialized) {
      return;
    }

    dispatch(refreshTokenThunk())
      .unwrap()
      .then(() => {
        setAuthChecked(true);
      })
      .catch(() => {
        router.replace("/");
      });
  }, [dispatch, isInitialized, router, user]);`;

if (text.includes(oldRedirectEffect)) {
  text = text.replace(oldRedirectEffect, newRedirectEffect);
} else {
  console.log('Редирект-эффект не найден, пропускаю');
}

text = text.replace(
  `if (!isInitialized || !user) {`,
  `if (!isInitialized || !authChecked || !user) {`,
);

text = text.replaceAll(
  `firstNameInputRef.current?.select();`,
  `const input = firstNameInputRef.current;

      if (!input) {
        return;
      }

      const end = input.value.length;

      input.focus();
      input.setSelectionRange(end, end);`,
);

text = text.replaceAll(
  `lastNameInputRef.current?.select();`,
  `const input = lastNameInputRef.current;

      if (!input) {
        return;
      }

      const end = input.value.length;

      input.focus();
      input.setSelectionRange(end, end);`,
);

fs.writeFileSync(file, text);
console.log('PATCHED profile page auth check');
NODE

echo "========== CLIENT: имя пользователя на странице классов =========="
node <<'NODE'
const fs = require('fs');

const file = 'src/app/classes/page.tsx';

if (!fs.existsSync(file)) {
  console.log('Не найден src/app/classes/page.tsx');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

if (!text.startsWith('"use client";')) {
  text = `"use client";\n\n${text}`;
}

if (!text.includes('useAppSelector')) {
  text = text.replace(
    `import Link from "next/link";`,
    `import Link from "next/link";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";`,
  );
}

if (!text.includes('const user = useAppSelector')) {
  text = text.replace(
    `export default function ClassesPage() {
  return (`,
    `export default function ClassesPage() {
  const user = useAppSelector((state) => state.user.user);
  const userName = user?.name?.trim() || "Пользователь";
  const firstName = userName.split(/\\s+/)[0] || "Пользователь";
  const avatarLetter = firstName.charAt(0).toUpperCase();

  return (`,
  );
}

text = text.replaceAll(
  `Добро пожаловать, Иван! 👋`,
  `Добро пожаловать, {firstName}! 👋`,
);

text = text.replaceAll(
  `<div className="profile-avatar">И</div>`,
  `<div className="profile-avatar">{avatarLetter}</div>`,
);

text = text.replaceAll(
  `<div className="classes-user-avatar">И</div>`,
  `<div className="classes-user-avatar">{avatarLetter}</div>`,
);

text = text.replaceAll(
  `<strong>Иван</strong>`,
  `<strong>{firstName}</strong>`,
);

fs.writeFileSync(file, text);
console.log('PATCHED classes page user name');
NODE

echo "========== DONE =========="
echo "Теперь перезапусти server и client."
