#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR" || exit 1


set -e

echo "================ SERVER: install multer ================"
cd server
npm i multer

echo "================ SERVER: create avatar migration ================"
cat > src/db/migrations/20260515190000-add-avatar-url-to-users.js <<'EOF'
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.avatarUrl) {
      await queryInterface.addColumn('Users', 'avatarUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.avatarUrl) {
      await queryInterface.removeColumn('Users', 'avatarUrl');
    }
  },
};
EOF

echo "================ SERVER: create multer middleware ================"
mkdir -p src/middleware

cat > src/middleware/uploadAvatar.js <<'EOF'
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const avatarsDir = path.join(__dirname, '../../public/uploads/avatars');

fs.mkdirSync(avatarsDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, avatarsDir);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Можно загружать только изображения: jpg, png, webp, gif'));
  }

  cb(null, true);
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

module.exports = uploadAvatar;
EOF

echo "================ SERVER: patch files ================"
node <<'NODE'
const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content);
}

function patchFile(file, patcher) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.log(`SKIP: ${file} not found`);
    return;
  }

  const before = read(full);
  const after = patcher(before);

  if (after !== before) {
    write(full, after);
    console.log(`PATCHED: ${file}`);
  } else {
    console.log(`OK: ${file}`);
  }
}

// 1. User model: avatarUrl
patchFile('src/db/models/user.js', (text) => {
  if (text.includes('avatarUrl:')) {
    return text;
  }

  const emailBlock = `      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },`;

  const replacement = `      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },`;

  if (text.includes(emailBlock)) {
    return text.replace(emailBlock, replacement);
  }

  const passwordBlock = `      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },`;

  if (text.includes(passwordBlock)) {
    return text.replace(
      passwordBlock,
      `      avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
${passwordBlock}`,
    );
  }

  return text;
});

// 2. App.js: static uploads
patchFile('src/App.js', (text) => {
  let result = text;

  if (!result.includes("const path = require('path')") && !result.includes('const path = require("path")')) {
    result = result.replace(
      /const express = require\(['"]express['"]\);?/,
      (match) => `${match}\nconst path = require('path');`,
    );
  }

  if (!result.includes("express.static(path.join(__dirname, '../public/uploads'))")) {
    const staticLine = "app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));";

    if (result.includes('app.use(express.json());')) {
      result = result.replace(
        'app.use(express.json());',
        `app.use(express.json());\n${staticLine}`,
      );
    } else {
      result = result.replace(
        /const app = express\(\);?/,
        (match) => `${match}\n${staticLine}`,
      );
    }
  }

  return result;
});

// 3. AuthService: findPublicUserById + updateUserProfileById
patchFile('src/services/AuthService.js', (text) => {
  if (text.includes('updateUserProfileById')) {
    return text;
  }

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

  if (text.includes('static async deleteUserById')) {
    return text.replace('  static async deleteUserById', `${methods}  static async deleteUserById`);
  }

  return text.replace(/\n}\s*module\.exports = AuthService;/, `${methods}\n}\n\nmodule.exports = AuthService;`);
});

// 4. AuthController: updateProfile
patchFile('src/controllers/AuthController.js', (text) => {
  if (text.includes('static async updateProfile')) {
    return text;
  }

  const method = `
  static async updateProfile(req, res) {
    try {
      const currentUser = res.locals.user;

      if (!currentUser?.id) {
        return res
          .status(401)
          .json(formatResponse(401, 'Пользователь не авторизован'));
      }

      const updateData = {};

      if (typeof req.body.name === 'string') {
        const name = req.body.name.trim();

        if (name.length < 2) {
          return res
            .status(400)
            .json(formatResponse(400, 'ФИО должно быть минимум 2 символа'));
        }

        updateData.name = name;
      }

      if (req.file) {
        updateData.avatarUrl = \`/uploads/avatars/\${req.file.filename}\`;
      }

      if (Object.keys(updateData).length === 0) {
        const user = await AuthService.findPublicUserById(currentUser.id);

        return res
          .status(200)
          .json(formatResponse(200, 'Нет изменений', { user }));
      }

      const user = await AuthService.updateUserProfileById(
        currentUser.id,
        updateData,
      );

      if (!user) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пользователь не найден'));
      }

      const { accessToken } = generateTokens({ user });

      return res.status(200).json(
        formatResponse(200, 'Профиль обновлён', {
          user,
          accessToken,
        }),
      );
    } catch (error) {
      console.log('======== AuthController.updateProfile =========');
      console.log(error);

      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при обновлении профиля'));
    }
  }

`;

  if (text.includes('static async deleteAccount')) {
    return text.replace('  static async deleteAccount', `${method}  static async deleteAccount`);
  }

  return text.replace(/\n}\s*module\.exports = AuthController;/, `${method}\n}\n\nmodule.exports = AuthController;`);
});

// 5. authRoute: add multer + patch route
patchFile('src/routes/authRoute.js', (text) => {
  let result = text;

  if (!result.includes("uploadAvatar")) {
    result = result.replace(
      /const verifyAccessToken = require\(['"]\.\.\/middleware\/verifyAccessToken['"]\);?/,
      (match) => `${match}\nconst uploadAvatar = require('../middleware/uploadAvatar');`,
    );
  }

  if (!result.includes(".patch('/me', verifyAccessToken, uploadAvatar.single('avatar'), AuthController.updateProfile)")) {
    if (result.includes(".delete('/me', verifyAccessToken, AuthController.deleteAccount)")) {
      result = result.replace(
        ".delete('/me', verifyAccessToken, AuthController.deleteAccount)",
        ".patch('/me', verifyAccessToken, uploadAvatar.single('avatar'), AuthController.updateProfile)\n  .delete('/me', verifyAccessToken, AuthController.deleteAccount)",
      );
    } else {
      result = result.replace(
        /authRouter\s*/,
        "authRouter\n  .patch('/me', verifyAccessToken, uploadAvatar.single('avatar'), AuthController.updateProfile)\n",
      );
    }
  }

  return result;
});
NODE

echo "================ SERVER: migrate ================"
npx sequelize-cli db:migrate

echo "================ CLIENT: patch user type ================"
cd ../client

node <<'NODE'
const fs = require('fs');
const path = require('path');

function patchFile(file, patcher) {
  const full = path.join(process.cwd(), file);

  if (!fs.existsSync(full)) {
    console.log(`SKIP: ${file} not found`);
    return;
  }

  const before = fs.readFileSync(full, 'utf8');
  const after = patcher(before);

  if (after !== before) {
    fs.writeFileSync(full, after);
    console.log(`PATCHED: ${file}`);
  } else {
    console.log(`OK: ${file}`);
  }
}

patchFile('src/entities/user/model/index.ts', (text) => {
  if (text.includes('avatarUrl?:')) {
    return text;
  }

  if (text.includes('username: string;')) {
    return text.replace(
      '  username: string;',
      '  username: string;\n  avatarUrl?: string | null;',
    );
  }

  if (text.includes('email: string;')) {
    return text.replace(
      '  email: string;',
      '  email: string;\n  avatarUrl?: string | null;',
    );
  }

  return text;
});
NODE

echo "================ CLIENT: patch UserApiThunk ================"
node <<'NODE'
const fs = require('fs');
const file = 'src/entities/user/api/UserApiThunk.ts';

if (!fs.existsSync(file)) {
  console.log(`SKIP: ${file} not found`);
  process.exit(0);
}

let text = fs.readFileSync(file, 'utf8');

if (!text.includes('UPDATE_PROFILE')) {
  text = text.replace(
    'DELETE_ACCOUNT: "user/deleteAccount",',
    'DELETE_ACCOUNT: "user/deleteAccount",\n  UPDATE_PROFILE: "user/updateProfile",',
  );

  text = text.replace(
    'DELETE_ACCOUNT: "auth/me",',
    'DELETE_ACCOUNT: "auth/me",\n  UPDATE_PROFILE: "auth/me",',
  );
}

if (!text.includes('export const updateProfileThunk')) {
  const thunk = `

export const updateProfileThunk = createAsyncThunk<
  UserType,
  { name: string; avatar?: File | null },
  { rejectValue: string }
>(USER_THUNK_NAMES.UPDATE_PROFILE, async (payload, { rejectWithValue }) => {
  try {
    const formData = new FormData();

    formData.append("name", payload.name);

    if (payload.avatar) {
      formData.append("avatar", payload.avatar);
    }

    const { data } = await axiosInstance.patch<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.UPDATE_PROFILE, formData);

    if (data.statusCode === 200 && data.data?.user) {
      setAccessToken(data.data.accessToken ?? "");
      return data.data.user;
    }

    return rejectWithValue(data.message ?? "Ошибка при обновлении профиля");
  } catch (error) {
    const d = (error as AxiosError<ServerResponseType<null>>).response?.data;

    return rejectWithValue(
      d?.error ?? d?.message ?? "Ошибка при обновлении профиля",
    );
  }
});
`;

  text = text.replace(
    'export const deleteAccountThunk',
    `${thunk}\nexport const deleteAccountThunk`,
  );
}

fs.writeFileSync(file, text);
console.log(`PATCHED: ${file}`);
NODE

echo "================ CLIENT: patch userSlice ================"
node <<'NODE'
const fs = require('fs');
const file = 'src/entities/user/slice/userSlice.ts';

if (!fs.existsSync(file)) {
  console.log(`SKIP: ${file} not found`);
  process.exit(0);
}

let text = fs.readFileSync(file, 'utf8');

if (!text.includes('updateProfileThunk')) {
  text = text.replace(
    'registerThunk,',
    'registerThunk,\n  updateProfileThunk,',
  );
}

if (!text.includes('builder.addCase(updateProfileThunk.pending')) {
  const block = `
    builder.addCase(updateProfileThunk.pending, (state) => {
      state.error = null;
      state.isLoading = true;
    });

    builder.addCase(updateProfileThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.user = action.payload;
      state.error = null;
    });

    builder.addCase(updateProfileThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload ?? "Ошибка при обновлении профиля";
    });

`;

  text = text.replace(
    '    builder.addCase(deleteAccountThunk.pending',
    `${block}    builder.addCase(deleteAccountThunk.pending`,
  );
}

fs.writeFileSync(file, text);
console.log(`PATCHED: ${file}`);
NODE

echo "================ CLIENT: rewrite profile page ================"
mkdir -p src/app/profile

cat > src/app/profile/page.tsx <<'EOF'
"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileThunk } from "@/entities/user/api/UserApiThunk";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import "./page.css";

function getApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
}

function getAvatarSrc(avatarUrl?: string | null) {
  if (!avatarUrl) {
    return "/avatar.jpg";
  }

  if (avatarUrl.startsWith("http")) {
    return avatarUrl;
  }

  return `${getApiOrigin()}${avatarUrl}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.user.user);
  const isInitialized = useAppSelector((state) => state.user.isInitialized);
  const isLoading = useAppSelector((state) => state.user.isLoading);
  const error = useAppSelector((state) => state.user.error);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/");
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatar(null);
      setAvatarPreview(null);
    }
  }, [user]);

  const avatarSrc = useMemo(() => {
    if (avatarPreview) {
      return avatarPreview;
    }

    return getAvatarSrc(user?.avatarUrl);
  }, [avatarPreview, user?.avatarUrl]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    setSuccess("");

    if (!file) {
      setAvatar(null);
      setAvatarPreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Можно загрузить только изображение");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Файл должен быть не больше 2 МБ");
      event.target.value = "";
      return;
    }

    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSuccess("");

    try {
      await dispatch(updateProfileThunk({ name, avatar })).unwrap();

      setAvatar(null);
      setAvatarPreview(null);
      setSuccess("Профиль сохранён");
    } catch {
      setSuccess("");
    }
  };

  if (!isInitialized || !user) {
    return (
      <main className="profile-page">
        <section className="profile-card">
          <p>Загрузка...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-card">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/classes")}
        >
          Назад
        </button>

        <h1>Профиль</h1>

        <form className="profile-form" onSubmit={handleSubmit}>
          <label className="avatar-box">
            <img src={avatarSrc} alt="Фото профиля" />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarChange}
            />
            <span>Сменить фото</span>
          </label>

          <label className="profile-field">
            <span>ФИО</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSuccess("");
              }}
              placeholder="Иван Иванов"
              minLength={2}
              required
            />
          </label>

          <div className="readonly-info">
            <p>
              <span>Email:</span> {user.email}
            </p>

            {"username" in user ? (
              <p>
                <span>Username:</span> @{user.username}
              </p>
            ) : null}
          </div>

          {error ? <p className="profile-error">{error}</p> : null}
          {success ? <p className="profile-success">{success}</p> : null}

          <button className="save-button" type="submit" disabled={isLoading}>
            {isLoading ? "Сохраняю..." : "Сохранить изменения"}
          </button>
        </form>
      </section>
    </main>
  );
}
EOF

cat > src/app/profile/page.css <<'EOF'
.profile-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background:
    radial-gradient(circle at top left, rgba(124, 58, 237, 0.24), transparent 34rem),
    #070a13;
  color: #ffffff;
}

.profile-card {
  width: min(720px, 100%);
  padding: 32px;
  border-radius: 28px;
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
}

.back-button {
  border: 0;
  background: transparent;
  color: #a78bfa;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 20px;
}

.profile-card h1 {
  margin: 0 0 28px;
  font-size: 42px;
  letter-spacing: -0.05em;
}

.profile-form {
  display: grid;
  gap: 22px;
}

.avatar-box {
  position: relative;
  width: 160px;
  height: 160px;
  display: block;
  cursor: pointer;
}

.avatar-box img {
  width: 160px;
  height: 160px;
  display: block;
  object-fit: cover;
  border-radius: 50%;
  border: 4px solid rgba(167, 139, 250, 0.45);
  background: rgba(255, 255, 255, 0.08);
}

.avatar-box input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.avatar-box span {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 8px 12px;
  border-radius: 999px;
  background: #7c3aed;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
}

.profile-field {
  display: grid;
  gap: 8px;
}

.profile-field span {
  color: #a1a1aa;
  font-size: 14px;
  font-weight: 700;
}

.profile-field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.72);
  color: #ffffff;
  outline: none;
  padding: 16px 18px;
  font-size: 17px;
}

.profile-field input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.14);
}

.readonly-info {
  display: grid;
  gap: 8px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
}

.readonly-info p {
  margin: 0;
  color: #d4d4d8;
}

.readonly-info span {
  color: #a1a1aa;
  font-weight: 800;
}

.profile-error,
.profile-success {
  margin: 0;
  padding: 14px 16px;
  border-radius: 14px;
  font-weight: 700;
}

.profile-error {
  color: #fecaca;
  background: rgba(185, 28, 28, 0.22);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.profile-success {
  color: #bbf7d0;
  background: rgba(22, 101, 52, 0.22);
  border: 1px solid rgba(74, 222, 128, 0.26);
}

.save-button {
  min-height: 50px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: #ffffff;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.save-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
EOF

echo "================ DONE ================"
echo "Теперь перезапусти server и client."
