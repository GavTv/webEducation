#!/bin/bash

set -e

echo "========== SERVER: install multer =========="
cd server
npm i multer

echo "========== SERVER: avatarUrl migration =========="
cat > src/db/migrations/20260515195500-add-avatar-url-to-users.js <<'EOF'
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

echo "========== SERVER: multer middleware =========="
mkdir -p src/middleware

cat > src/middleware/uploadAvatar.js <<'EOF'
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const formatResponse = require('../utils/formatResponse');

const avatarsDir = path.join(__dirname, '../../public/uploads/avatars');

fs.mkdirSync(avatarsDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, avatarsDir);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Можно загружать только изображения: jpg, png, webp, gif'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

function uploadAvatar(req, res, next) {
  upload.single('avatar')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json(formatResponse(400, 'Файл должен быть не больше 2 МБ'));
    }

    return res
      .status(400)
      .json(formatResponse(400, error.message || 'Ошибка загрузки файла'));
  });
}

module.exports = uploadAvatar;
EOF

echo "========== SERVER: patch server files =========="
node <<'NODE'
const fs = require('fs');
const path = require('path');

function patchFile(file, patcher) {
  const fullPath = path.join(process.cwd(), file);

  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP ${file}`);
    return;
  }

  const before = fs.readFileSync(fullPath, 'utf8');
  const after = patcher(before);

  if (before !== after) {
    fs.writeFileSync(fullPath, after);
    console.log(`PATCHED ${file}`);
  } else {
    console.log(`OK ${file}`);
  }
}

// User model: avatarUrl
patchFile('src/db/models/user.js', (text) => {
  if (text.includes('avatarUrl:')) {
    return text;
  }

  return text.replace(
`      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },`,
`      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },`,
  );
});

// App.js: раздача загруженных файлов
patchFile('src/App.js', (text) => {
  let result = text;

  if (!result.includes("express.static(path.join(__dirname, '../public/uploads'))")) {
    result = result.replace(
      'serverConfig(app);',
      `serverConfig(app);

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));`,
    );
  }

  return result;
});

// AuthService: методы поиска и обновления профиля
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

  return text.replace(
    '\n}\n\nmodule.exports = AuthService;',
    `${methods}\n}\n\nmodule.exports = AuthService;`,
  );
});

// AuthController: updateProfile
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

      const { accessToken, refreshToken } = generateTokens({ user });

      return res
        .status(200)
        .cookie('refreshToken', refreshToken, cookieConfig)
        .json(
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

  return text.replace(
    '\n}\n\nmodule.exports = AuthController;',
    `${method}\n}\n\nmodule.exports = AuthController;`,
  );
});

// authRoute: PATCH /auth/me с multer
patchFile('src/routes/authRoute.js', (text) => {
  let result = text;

  if (!result.includes("verifyAccessToken")) {
    result = result.replace(
      "const verifyRefreshToken = require('../middleware/verifyRefreshToken');",
      "const verifyRefreshToken = require('../middleware/verifyRefreshToken');\nconst verifyAccessToken = require('../middleware/verifyAccessToken');",
    );
  }

  if (!result.includes("uploadAvatar")) {
    result = result.replace(
      "const verifyRefreshToken = require('../middleware/verifyRefreshToken');",
      "const verifyRefreshToken = require('../middleware/verifyRefreshToken');\nconst uploadAvatar = require('../middleware/uploadAvatar');",
    );
  }

  if (!result.includes(".patch('/me', verifyAccessToken, uploadAvatar, AuthController.updateProfile)")) {
    result = result.replace(
      ".post('/logout', AuthController.logout)",
      ".post('/logout', AuthController.logout)\n  .patch('/me', verifyAccessToken, uploadAvatar, AuthController.updateProfile)",
    );
  }

  return result;
});
NODE

echo "========== SERVER: migrate =========="
npx sequelize-cli db:migrate

echo "========== CLIENT: patch types =========="
cd ../client

node <<'NODE'
const fs = require('fs');

const file = 'src/entities/user/model/index.ts';

if (fs.existsSync(file)) {
  let text = fs.readFileSync(file, 'utf8');

  if (!text.includes('avatarUrl?:')) {
    text = text.replace(
      '  username: string;',
      '  username: string;\n  avatarUrl?: string | null;',
    );
  }

  fs.writeFileSync(file, text);
  console.log('PATCHED src/entities/user/model/index.ts');
}
NODE

echo "========== CLIENT: patch UserApiThunk =========="
node <<'NODE'
const fs = require('fs');

const file = 'src/entities/user/api/UserApiThunk.ts';

if (!fs.existsSync(file)) {
  console.log('SKIP UserApiThunk.ts');
  process.exit(0);
}

let text = fs.readFileSync(file, 'utf8');

if (!text.includes('UPDATE_PROFILE: "user/updateProfile"')) {
  text = text.replace(
    'DELETE_ACCOUNT: "user/deleteAccount",',
    'DELETE_ACCOUNT: "user/deleteAccount",\n  UPDATE_PROFILE: "user/updateProfile",',
  );
}

if (!text.includes('UPDATE_PROFILE: "auth/me"')) {
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
console.log('PATCHED UserApiThunk.ts');
NODE

echo "========== CLIENT: patch userSlice =========="
node <<'NODE'
const fs = require('fs');

const file = 'src/entities/user/slice/userSlice.ts';

if (!fs.existsSync(file)) {
  console.log('SKIP userSlice.ts');
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
console.log('PATCHED userSlice.ts');
NODE

echo "========== CLIENT: restore profile page with edit =========="
cat > src/app/profile/page.tsx <<'EOF'
"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import { useAppDispatch, useAppSelector } from "@/shared/hooks/useReduxHooks";
import {
  deleteAccountThunk,
  logoutThunk,
  updateProfileThunk,
} from "@/entities/user/api/UserApiThunk";
import { setError } from "@/entities/user/slice/userSlice";
import { ConfirmModal } from "@/shared/ui/ConfirmModal/ConfirmModal";
import "./page.css";

function getApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
}

function getAvatarSrc(avatarUrl?: string | null) {
  if (!avatarUrl) {
    return "";
  }

  if (avatarUrl.startsWith("http")) {
    return avatarUrl;
  }

  return `${getApiOrigin()}${avatarUrl}`;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts[1] || "",
    patronymic: parts.slice(2).join(" "),
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const user = useAppSelector((s) => s.user.user);
  const isInitialized = useAppSelector((s) => s.user.isInitialized);
  const isLoading = useAppSelector((s) => s.user.isLoading);
  const authError = useAppSelector((s) => s.user.error);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/");
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (user) {
      const parsedName = splitName(user.name);

      setFirstName(parsedName.firstName);
      setLastName(parsedName.lastName);
      setPatronymic(parsedName.patronymic);
      setAvatarFile(null);
      setAvatarPreview("");
    }
  }, [user]);

  const avatarSrc = useMemo(() => {
    if (avatarPreview) {
      return avatarPreview;
    }

    return getAvatarSrc(user?.avatarUrl);
  }, [avatarPreview, user?.avatarUrl]);

  const fullName = useMemo(() => {
    return [firstName, lastName, patronymic]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
  }, [firstName, lastName, patronymic]);

  const handleBack = useCallback(() => {
    router.push(clientRoutes.classes);
  }, [router]);

  const handleLogout = useCallback(() => {
    dispatch(logoutThunk())
      .unwrap()
      .then(() => {
        router.push("/");
      })
      .catch(() => {});
  }, [dispatch, router]);

  const handleOpenDelete = useCallback(() => {
    dispatch(setError(null));
    setDeleteModalOpen(true);
  }, [dispatch]);

  const handleCloseDelete = useCallback(() => {
    if (!isLoading) {
      dispatch(setError(null));
      setDeleteModalOpen(false);
    }
  }, [dispatch, isLoading]);

  const handleConfirmDelete = useCallback(() => {
    dispatch(deleteAccountThunk())
      .unwrap()
      .then(() => {
        setDeleteModalOpen(false);
        router.push("/");
      })
      .catch(() => {});
  }, [dispatch, router]);

  const handleAvatarChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    setSuccessMessage("");
    dispatch(setError(null));

    if (!file) {
      setAvatarFile(null);
      setAvatarPreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      dispatch(setError("Можно загрузить только изображение"));
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      dispatch(setError("Файл должен быть не больше 2 МБ"));
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }, [dispatch]);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSuccessMessage("");
    dispatch(setError(null));

    if (fullName.trim().length < 2) {
      dispatch(setError("ФИО должно быть минимум 2 символа"));
      return;
    }

    dispatch(updateProfileThunk({ name: fullName, avatar: avatarFile }))
      .unwrap()
      .then(() => {
        setAvatarFile(null);
        setAvatarPreview("");
        setSuccessMessage("Профиль сохранён");
      })
      .catch(() => {});
  }, [avatarFile, dispatch, fullName]);

  if (!isInitialized || !user) {
    return (
      <main className="profile-page profile-page--centered">
        <div className="profile-loading" aria-busy="true">
          <Loader2 className="profile-loading-spin" size={32} />
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      {deleteModalOpen ? (
        <ConfirmModal
          title="Вы точно хотите удалить свой аккаунт?"
          lines={["Внимание! Все ваши данные будут удалены безвозвратно."]}
          confirmLabel="Подтвердить"
          cancelLabel="Отмена"
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseDelete}
          isBusy={isLoading}
          errorMessage={authError}
        />
      ) : null}

      <section className="profile-card">
        <div className="profile-card-topbar">
          <button type="button" className="back-btn" onClick={handleBack}>
            Назад
          </button>

          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading && !deleteModalOpen ? (
              <Loader2 className="profile-btn-spin" size={18} aria-hidden />
            ) : null}
            Выйти
          </button>
        </div>

        <header className="profile-header">
          <h1>Профиль</h1>
        </header>

        <form onSubmit={handleSubmit}>
          <section className="profile-top">
            <label className="avatar-box">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Фото профиля" />
              ) : (
                <div className="avatar-placeholder">Фото профиля</div>
              )}

              <input
                className="avatar-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarChange}
              />

              <span className="camera-btn" aria-label="Сменить фото">
                📷
              </span>
            </label>

            <div className="profile-identity">
              <h2>{fullName || user.name}</h2>
              <p>@{user.username}</p>
            </div>
          </section>

          <section className="profile-content">
            <div className="info-section">
              <h3>Личная информация</h3>

              <div className="info-grid">
                <div className="info-card">
                  <span>Имя</span>
                  <input
                    className="profile-edit-input"
                    value={firstName}
                    onChange={(event) => {
                      setFirstName(event.target.value);
                      setSuccessMessage("");
                    }}
                    placeholder="Имя"
                  />
                  <button type="button" aria-label="Редактировать имя">
                    ✎
                  </button>
                </div>

                <div className="info-card">
                  <span>Фамилия</span>
                  <input
                    className="profile-edit-input"
                    value={lastName}
                    onChange={(event) => {
                      setLastName(event.target.value);
                      setSuccessMessage("");
                    }}
                    placeholder="Фамилия"
                  />
                  <button type="button" aria-label="Редактировать фамилию">
                    ✎
                  </button>
                </div>

                <div className="info-card wide">
                  <span>Отчество</span>
                  <input
                    className="profile-edit-input"
                    value={patronymic}
                    onChange={(event) => {
                      setPatronymic(event.target.value);
                      setSuccessMessage("");
                    }}
                    placeholder="—"
                  />
                  <button type="button" aria-label="Редактировать отчество">
                    ✎
                  </button>
                </div>
              </div>

              <p className="hint">
                Вы можете изменить ФИО и фото профиля. Никнейм используется как
                постоянный идентификатор и не редактируется.
              </p>

              {authError ? <p className="profile-error">{authError}</p> : null}
              {successMessage ? (
                <p className="profile-success">{successMessage}</p>
              ) : null}

              <div className="save-zone">
                <button
                  type="submit"
                  className="save-profile-btn"
                  disabled={isLoading}
                >
                  {isLoading && !deleteModalOpen ? (
                    <Loader2 className="profile-btn-spin" size={18} aria-hidden />
                  ) : null}
                  Сохранить изменения
                </button>
              </div>

              <div className="danger-zone">
                <button
                  type="button"
                  className="delete-account-btn"
                  onClick={handleOpenDelete}
                  disabled={isLoading}
                >
                  Удалить аккаунт
                </button>
              </div>
            </div>
          </section>
        </form>
      </section>
    </main>
  );
}
EOF

echo "========== CLIENT: keep old styles + add edit styles =========="
cat > src/app/profile/page.css <<'EOF'
.profile-page {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: clip;
  background:
    radial-gradient(circle at 20% 0%, rgba(124, 58, 237, 0.22), transparent 35%),
    radial-gradient(circle at 90% 20%, rgba(79, 70, 229, 0.14), transparent 35%),
    #050914;
  color: #fff;
  font-family: Inter, system-ui, sans-serif;
  padding: var(--app-page-gutter-y) var(--app-page-gutter-x);
}

.profile-card {
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

.profile-card-topbar {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin: 0 0 8px;
}

.profile-header {
  flex-shrink: 0;
  width: 100%;
  margin: 0 0 clamp(16px, 2.5vw, 24px);
}

.profile-header h1 {
  margin: 0;
  font-size: clamp(26px, 4vw, 34px);
  line-height: 1.2;
}

.back-btn {
  flex-shrink: 0;
  border: 0;
  border-radius: 14px;
  padding: 10px 18px;
  color: #fff;
  background: rgba(124, 58, 237, 0.22);
  border: 1px solid rgba(139, 92, 246, 0.35);
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
}

.back-btn:hover {
  background: rgba(124, 58, 237, 0.32);
}

.logout-btn {
  flex-shrink: 0;
  border-radius: 14px;
  padding: 10px 18px;
  color: #fff;
  background: rgba(185, 28, 28, 0.92);
  border: 1px solid rgba(248, 113, 113, 0.45);
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.logout-btn:hover:not(:disabled) {
  background: #dc2626;
}

.logout-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.profile-btn-spin {
  animation: profile-spin 0.85s linear infinite;
}

@keyframes profile-spin {
  to {
    transform: rotate(360deg);
  }
}

.profile-top {
  flex-shrink: 0;
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: clamp(16px, 3vw, 28px);
}

.avatar-box {
  position: relative;
  width: 120px;
  height: 120px;
  cursor: pointer;
}

@media (min-width: 640px) {
  .avatar-box {
    width: 140px;
    height: 140px;
  }
}

@media (min-width: 1200px) {
  .avatar-box {
    width: 156px;
    height: 156px;
  }
}

.avatar-box img,
.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #1f2937;
  object-fit: cover;
  display: block;
  border: 4px solid rgba(139, 92, 246, 0.46);
  box-sizing: border-box;
}

.avatar-placeholder {
  display: grid;
  place-items: center;
  text-align: center;
  padding: 18px;
  color: #a7a7b4;
  font-size: clamp(12px, 1.2vw, 14px);
  line-height: 1.2;
  font-weight: 700;
}

.avatar-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.camera-btn {
  position: absolute;
  right: 0;
  bottom: 4px;
  width: 44px;
  height: 44px;
  border: 2px solid rgba(8, 13, 26, 0.9);
  border-radius: 50%;
  color: white;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 18px;
  line-height: 1;
  z-index: 3;
}

.profile-identity {
  min-width: 0;
}

.profile-identity h2 {
  margin: 0;
  font-size: clamp(22px, 3.5vw, 32px);
  line-height: 1.2;
}

.profile-identity > p {
  margin: 8px 0 0;
  color: #9ca3af;
  font-size: clamp(15px, 2vw, 18px);
  word-break: break-word;
}

.profile-content {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  margin-top: clamp(20px, 3vw, 36px);
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(24px, 3vw, 40px);
  align-items: start;
}

.info-section {
  min-width: 0;
  width: 100%;
}

.info-section h3 {
  margin: 0 0 16px;
  font-size: clamp(18px, 2.5vw, 22px);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(14px, 2vw, 20px);
}

.info-card {
  min-height: 100px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.12);
  padding: 20px 52px 20px 20px;
  position: relative;
  min-width: 0;
}

.info-card.wide {
  grid-column: 1 / -1;
}

.info-card span {
  display: block;
  color: #9ca3af;
  margin-bottom: 8px;
  font-size: 13px;
}

.profile-edit-input {
  width: 100%;
  border: 0;
  outline: 0;
  padding: 0;
  background: transparent;
  color: #fff;
  font: inherit;
  font-size: clamp(18px, 2.2vw, 24px);
  font-weight: 500;
  line-height: 1.3;
}

.profile-edit-input::placeholder {
  color: #6b7280;
}

.info-card button {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #8b5cf6;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  padding: 8px;
  border-radius: 10px;
  pointer-events: none;
}

.hint {
  margin-top: 16px;
  color: #9ca3af;
  line-height: 1.6;
  font-size: 14px;
  max-width: 70ch;
}

.profile-error,
.profile-success {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 14px;
  font-weight: 700;
}

.profile-error {
  color: #fecaca;
  background: rgba(185, 28, 28, 0.24);
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.profile-success {
  color: #bbf7d0;
  background: rgba(22, 101, 52, 0.24);
  border: 1px solid rgba(74, 222, 128, 0.25);
}

.save-zone {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.save-profile-btn {
  flex: 0 0 auto;
  width: fit-content;
  max-width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 12px 20px;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  border: 1px solid rgba(139, 92, 246, 0.45);
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.save-profile-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.danger-zone {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 100%;
  box-sizing: border-box;
}

.delete-account-btn {
  flex: 0 0 auto;
  width: fit-content;
  max-width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 12px 20px;
  color: #fff;
  background: rgba(185, 28, 28, 0.92);
  border: 1px solid rgba(248, 113, 113, 0.45);
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
}

.delete-account-btn:hover:not(:disabled) {
  background: #dc2626;
}

.delete-account-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.profile-page--centered {
  display: grid;
  place-items: center;
}

.profile-loading {
  color: #a78bfa;
}

.profile-loading-spin {
  animation: profile-spin 0.85s linear infinite;
}

@media (max-width: 1023px) {
  .profile-card {
    min-height: unset;
  }
}

@media (max-width: 520px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-card.wide {
    grid-column: 1;
  }

  .profile-top {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .profile-identity {
    text-align: center;
  }

  .save-zone,
  .danger-zone {
    align-items: stretch;
  }

  .save-profile-btn,
  .delete-account-btn {
    width: 100%;
  }
}
EOF

echo "========== DONE =========="
echo "Теперь перезапусти server и client."
