const AuthService = require('../services/AuthService');
const formatResponse = require('../utils/formatResponse');
const { User } = require('../db/models');
const bcrypt = require('bcrypt');
const generateTokens = require('../utils/generateTokens');

const {
  getRefreshCookieConfig,
  clearRefreshCookie,
} = require('../config/cookieConfig');
const PasswordResetService = require('../services/PasswordResetService');
const { OAuth2Client } = require('google-auth-library');
const {
  signPasswordResetToken,
  verifyPasswordResetToken,
} = require('../utils/passwordResetJwt');

class AuthController {
  /** Проверка email: формат name@domain.com и свободен ли адрес. */
  static async checkEmailAvailability(req, res) {
    try {
      const raw =
        typeof req.body?.email === 'string'
          ? req.body.email
          : typeof req.query?.email === 'string'
            ? req.query.email
            : '';
      const email = typeof raw === 'string' ? raw.toLowerCase().trim() : '';

      if (!email) {
        return res.status(200).json(
          formatResponse(200, 'ok', {
            formatOk: false,
            available: null,
            message: 'Введите email',
          }),
        );
      }

      if (!User.validateEmail(email)) {
        return res.status(200).json(
          formatResponse(200, 'ok', {
            formatOk: false,
            available: null,
            message:
              'Укажите корректный email',
          }),
        );
      }

      const existing = await AuthService.findUserByEmail(email);
      return res.status(200).json(
        formatResponse(200, 'ok', {
          formatOk: true,
          available: !existing,
          message: existing
            ? 'Пользователь с таким email уже зарегистрирован'
            : null,
        }),
      );
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при проверке email'));
    }
  }

  /** Проверка username: только английские буквы/цифры/_ и свободен ли логин. */
  static async checkUsernameAvailability(req, res) {
    try {
      const raw =
        typeof req.body?.username === 'string'
          ? req.body.username
          : typeof req.query?.username === 'string'
            ? req.query.username
            : '';
      const username =
        typeof raw === 'string' ? raw.toLowerCase().trim() : '';

      if (!username) {
        return res.status(200).json(
          formatResponse(200, 'ok', {
            formatOk: false,
            available: null,
            message: 'Введите имя пользователя',
          }),
        );
      }

      if (!User.validateUsername(username)) {
        return res.status(200).json(
          formatResponse(200, 'ok', {
            formatOk: false,
            available: null,
            message:
              '3–30 символов: только английские буквы, цифры и _; нужна хотя бы одна буква',
          }),
        );
      }

      const existing = await AuthService.findUserByUsername(username);
      return res.status(200).json(
        formatResponse(200, 'ok', {
          formatOk: true,
          available: !existing,
          message: existing ? 'Это имя пользователя уже занято' : null,
        }),
      );
    } catch (error) {
      console.log('======== AuthController.checkUsernameAvailability =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при проверке имени'));
    }
  }

  static async register(req, res) {
    // Достаём данные для регистрации из тела запроса
    const { name, email, password, username, rememberMe } = req.body;
    const remember = Boolean(rememberMe);

    // Проводим валидацию данных для регистрации
    const { isValid, error } = User.validateRegistrationData({
      name,
      email,
      password,
      username,
    });

    if (!isValid) {
      return res
        .status(400)
        .json(formatResponse(400, 'Ошибка валидации', null, error));
    }

    // Нормализуем email для поиска существующего пользователя
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = String(username).toLowerCase().trim();

    try {
      const existingUser = await AuthService.findUserByEmail(normalizedEmail);

      if (existingUser) {
        return res
          .status(400)
          .json(formatResponse(400, 'Пользователь уже зарегистрирован'));
      }

      const existingUsername =
        await AuthService.findUserByUsername(normalizedUsername);

      if (existingUsername) {
        return res
          .status(400)
          .json(formatResponse(400, 'Это имя пользователя уже занято'));
      }

      // Хэшируем пароль
      const hashedPassword = await bcrypt.hash(password, 10);

      // создаём нового пользователя
      const newUser = await AuthService.createUser({
        name: name.trim(),
        email: normalizedEmail,
        username: normalizedUsername,
        password: hashedPassword,
      });

      if (!newUser) {
        return res
          .status(500)
          .json(formatResponse(500, 'Ошибка при создании пользователя'));
      }
      // удаляем информацию о пароле перед ответом от сервера
      delete newUser.password;

      const { accessToken, refreshToken } = generateTokens(
        { user: newUser },
        { rememberMe: remember },
      );

      return res
        .status(201)
        .cookie(
          'refreshToken',
          refreshToken,
          getRefreshCookieConfig(remember),
        )
        .json(
          formatResponse(201, 'Регистрация успешна', {
            user: newUser,
            accessToken,
          }),
        );
    } catch (error) {
      console.log('======== AuthController.register =========');
      console.log(error);
      return res
        .status(500)
        .json(
          formatResponse(500, 'Ошибка сервера при регистрации пользователя'),
        );
    }
  }

  static async login(req, res) {
    // Достаём данные для регистрации из тела запроса
    const { email, password, rememberMe } = req.body;
    const remember = Boolean(rememberMe);

    // Проводим валидацию данных для регистрации
    const { isValid, error } = User.validateLoginData({
      email,
      password,
    });

    if (!isValid) {
      return res
        .status(400)
        .json(formatResponse(400, 'Ошибка валидации', null, error));
    }

    // Нормализуем email для поиска существующего пользователя
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const existingUser = await AuthService.findUserByEmail(normalizedEmail);

      if (!existingUser) {
        return res
          .status(404)
          .json(
            formatResponse(
              404,
              'Пользователь с таким адресом не зарегистрирован',
            ),
          );
      }
      if (!existingUser.password) {
        return res.status(400).json(
          formatResponse(
            400,
            'Этот аккаунт без пароля. Войдите через Google или GitHub.',
          ),
        );
      }

      const isValidPassword = await bcrypt.compare(
        password,
        existingUser.password,
      );

      if (!isValidPassword) {
        return res
          .status(400)
          .json(formatResponse(400, 'Неверные данные для входа'));
      }

      // удаляем информацию о пароле перед ответом от сервера
      delete existingUser.password;

      const { accessToken, refreshToken } = generateTokens(
        { user: existingUser },
        { rememberMe: remember },
      );

      return res
        .status(200)
        .cookie(
          'refreshToken',
          refreshToken,
          getRefreshCookieConfig(remember),
        )
        .json(
          formatResponse(200, 'Успешный вход в приложение', {
            user: existingUser,
            accessToken,
          }),
        );
    } catch (error) {
      console.log('======== AuthController.login =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при входе в приложение'));
    }
  }

  static async _resolveGoogleOAuthProfile(body) {
    const { idToken, accessToken } = body;
    if (typeof accessToken === 'string' && accessToken.trim().length > 0) {
      const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken.trim()}` },
      });
      if (!r.ok) {
        throw new Error('GOOGLE_USERINFO');
      }
      const p = await r.json();
      if (!p?.sub || !p?.email) {
        throw new Error('GOOGLE_PROFILE');
      }
      if (p.email_verified !== true && p.email_verified !== 'true') {
        throw new Error('GOOGLE_EMAIL');
      }
      return {
        sub: String(p.sub),
        email: String(p.email).toLowerCase().trim(),
        name: (p.name && String(p.name).trim()) || String(p.email).split('@')[0],
      };
    }
    if (typeof idToken === 'string' && idToken.trim().length > 0) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Error('GOOGLE_CLIENT_MISSING');
      }
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: idToken.trim(),
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        throw new Error('GOOGLE_IDTOKEN');
      }
      if (payload.email_verified === false) {
        throw new Error('GOOGLE_EMAIL');
      }
      return {
        sub: payload.sub,
        email: payload.email.toLowerCase().trim(),
        name:
          (payload.name && String(payload.name).trim()) ||
          payload.email.split('@')[0],
      };
    }
    throw new Error('GOOGLE_NO_INPUT');
  }

  static async _resolveGithubOAuthProfile(accessToken) {
    const token = typeof accessToken === 'string' ? accessToken.trim() : '';
    if (!token) {
      throw new Error('GITHUB_NO_INPUT');
    }
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'webEducation-OAuth/1.0',
    };
    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) {
      throw new Error('GITHUB_USER');
    }
    const u = await userRes.json();
    let email = typeof u.email === 'string' ? u.email : null;
    if (!email) {
      const er = await fetch('https://api.github.com/user/emails', {
        headers,
      });
      if (er.ok) {
        const list = await er.json();
        const row =
          (Array.isArray(list) &&
            list.find((e) => e.primary && e.verified)) ||
          (Array.isArray(list) && list.find((e) => e.verified));
        email = row && typeof row.email === 'string' ? row.email : null;
      }
    }
    if (!email || !User.validateEmail(email.toLowerCase().trim())) {
      throw new Error('GITHUB_EMAIL');
    }
    const sub = String(u.id);
    const login = typeof u.login === 'string' ? u.login : `user_${sub}`;
    const name =
      (u.name && String(u.name).trim()) || login || email.split('@')[0];
    return {
      sub,
      email: email.toLowerCase().trim(),
      name,
      login,
    };
  }

  /** Вход через Google или GitHub (access_token → профиль). */
  static async oauthLogin(req, res) {
    const providerRaw = req.body?.provider;
    const provider =
      typeof providerRaw === 'string'
        ? String(providerRaw).toLowerCase().trim()
        : '';
    if (provider !== 'google' && provider !== 'github') {
      return res
        .status(400)
        .json(formatResponse(400, 'Укажите provider: google или github'));
    }

    const remember = Boolean(req.body.rememberMe);

    try {
      let sub;
      let email;
      let name;
      let githubLogin;

      if (provider === 'google') {
        const p = await AuthController._resolveGoogleOAuthProfile(req.body);
        ({ sub, email, name } = p);
      } else {
        const p = await AuthController._resolveGithubOAuthProfile(
          req.body.accessToken,
        );
        ({ sub, email, name, login: githubLogin } = p);
      }

      let user = null;
      if (provider === 'google') {
        user =
          (await AuthService.findUserByGoogleSub(sub)) ||
          (await AuthService.findUserByEmail(email));
      } else {
        user =
          (await AuthService.findUserByGithubSub(sub)) ||
          (await AuthService.findUserByEmail(email));
      }

      if (user) {
        if (user.password) {
          return res.status(409).json(
            formatResponse(
              409,
              'Этот email зарегистрирован с паролем. Войдите через почту.',
            ),
          );
        }

        if (provider === 'google') {
          if (user.google_sub && user.google_sub !== sub) {
            return res.status(403).json(
              formatResponse(403, 'Аккаунт привязан к другому Google'),
            );
          }
          if (user.github_sub && !user.google_sub) {
            return res.status(409).json(
              formatResponse(
                409,
                'Этот email привязан к GitHub. Войдите через GitHub.',
              ),
            );
          }
          if (!user.google_sub) {
            await User.update({ google_sub: sub }, { where: { id: user.id } });
            user = { ...user, google_sub: sub };
          }
        } else {
          if (user.github_sub && user.github_sub !== sub) {
            return res.status(403).json(
              formatResponse(403, 'Аккаунт привязан к другому GitHub'),
            );
          }
          if (user.google_sub && !user.github_sub) {
            return res.status(409).json(
              formatResponse(
                409,
                'Этот email привязан к Google. Войдите через Google.',
              ),
            );
          }
          if (!user.github_sub) {
            await User.update({ github_sub: sub }, { where: { id: user.id } });
            user = { ...user, github_sub: sub };
          }
        }
      } else {
        const username =
          provider === 'google'
            ? await AuthService.allocateUsernameForGoogle(email, sub)
            : await AuthService.allocateUsernameForGithub(githubLogin, sub);

        user = await AuthService.createUser({
          name,
          email,
          username,
          password: null,
          google_sub: provider === 'google' ? sub : null,
          github_sub: provider === 'github' ? sub : null,
        });
      }

      delete user.password;

      const { accessToken: appAccessToken, refreshToken } = generateTokens(
        { user },
        { rememberMe: remember },
      );

      return res
        .status(200)
        .cookie(
          'refreshToken',
          refreshToken,
          getRefreshCookieConfig(remember),
        )
        .json(
          formatResponse(200, 'Успешный вход в приложение', {
            user,
            accessToken: appAccessToken,
          }),
        );
    } catch (error) {
      const code = error?.message;
      const map = {
        GOOGLE_USERINFO: [401, 'Недействительный токен Google'],
        GOOGLE_PROFILE: [400, 'Некорректные данные Google'],
        GOOGLE_IDTOKEN: [400, 'Некорректные данные в токене Google'],
        GOOGLE_EMAIL: [400, 'Подтвердите email в аккаунте Google'],
        GOOGLE_CLIENT_MISSING: [
          503,
          'Вход через Google не настроен (GOOGLE_CLIENT_ID)',
        ],
        GOOGLE_NO_INPUT: [400, 'Нет данных Google для входа'],
        GITHUB_USER: [401, 'Недействительный токен GitHub'],
        GITHUB_EMAIL: [
          400,
          'Укажите видимый email в GitHub (Settings → Emails) или разрешите доступ к email.',
        ],
        GITHUB_NO_INPUT: [400, 'Нет токена GitHub'],
      };
      const m = map[code];
      if (m) {
        console.log('======== AuthController.oauthLogin =========', code);
        return res.status(m[0]).json(formatResponse(m[0], m[1]));
      }
      console.log('======== AuthController.oauthLogin =========');
      console.log(error?.message || error);
      return res
        .status(401)
        .json(
          formatResponse(
            401,
            provider === 'github'
              ? 'Не удалось войти через GitHub'
              : 'Не удалось войти через Google',
          ),
        );
    }
  }

  /** Совместимость: запросы без поля provider. */
  static async googleLogin(req, res) {
    req.body = { ...req.body, provider: 'google' };
    return AuthController.oauthLogin(req, res);
  }

  static async logout(req, res) {
    try {
      // формируем ответ
      return res
        .status(200)
        .clearCookie('refreshToken', clearRefreshCookie)
        .json(formatResponse(200, 'Успешный выход '));
    } catch (error) {
      console.log('======== AuthController.logout =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при выходе из приложения'));
    }
  }


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
        updateData.avatarUrl = `/uploads/avatars/${req.file.filename}`;
      }

      if (req.body.phone !== undefined) {
        const rawPhone =
          typeof req.body.phone === 'string' ? req.body.phone.trim() : '';

        if (!rawPhone) {
          updateData.phone = null;
        } else {
          const digits = rawPhone.replace(/\D/g, '');

          if (digits.length < 10 || digits.length > 15) {
            return res
              .status(400)
              .json(
                formatResponse(
                  400,
                  'Телефон должен содержать от 10 до 15 цифр',
                ),
              );
          }

          updateData.phone = rawPhone;
        }
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

      const { accessToken, refreshToken } = generateTokens(
        { user },
        { rememberMe: true },
      );

      return res
        .status(200)
        .cookie('refreshToken', refreshToken, getRefreshCookieConfig(true))
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

  static async deleteAccount(req, res) {
    try {
      const user = res.locals.user;
      if (!user?.id) {
        return res
          .status(403)
          .json(formatResponse(403, 'Невалидный пользователь'));
      }

      const deleted = await AuthService.deleteUserById(user.id);
      if (!deleted) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пользователь не найден'));
      }

      return res
        .status(200)
        .clearCookie('refreshToken', clearRefreshCookie)
        .json(formatResponse(200, 'Аккаунт удалён'));
    } catch (error) {
      console.log('======== AuthController.deleteAccount =========');
      console.log(error);
      return res
        .status(500)
        .json(
          formatResponse(500, 'Ошибка сервера при удалении аккаунта'),
        );
    }
  }

  /** Запрос кода на email (6 цифр, TTL 10 мин). Ответ одинаковый при отсутствии пользователя. */
  static async forgotPassword(req, res) {
    try {
      const raw = req.body?.email;
      const email =
        typeof raw === 'string' ? raw.toLowerCase().trim() : '';

      if (!email || !User.validateEmail(email)) {
        return res
          .status(400)
          .json(formatResponse(400, 'Укажите корректный email'));
      }

      await PasswordResetService.requestCode(email);

      return res.status(200).json(
        formatResponse(
          200,
          'Если этот адрес зарегистрирован, мы отправили на него код. Код действует 10 минут.',
          { ok: true },
        ),
      );
    } catch (error) {
      const msg =
        typeof error?.message === 'string'
          ? error.message
          : String(error ?? 'unknown');

      if (msg === 'SMTP_NOT_CONFIGURED') {
        return res
          .status(503)
          .json(
            formatResponse(
              503,
              'Отправка почты не настроена. Обратитесь к администратору.',
            ),
          );
      }
      if (msg.startsWith('MAIL_SEND_FAILED') || msg.includes('MAIL_SEND_FAILED')) {
        console.log('======== AuthController.forgotPassword (SMTP) =========');
        console.log(msg);
        return res.status(502).json(
          formatResponse(
            502,
            'Почтовый сервер отклонил отправку. Для Gmail: пароль приложения, smtp.gmail.com:587, SMTP_SECURE=false, From = ваш gmail. Подробности в консоли сервера и в server/.env.example.',
          ),
        );
      }

      const pgMissing =
        (msg.includes('does not exist') && msg.includes('PasswordResetCodes')) ||
        (msg.includes('relation') && msg.includes('PasswordResetCodes'));
      if (pgMissing) {
        console.log('======== AuthController.forgotPassword (DB) =========');
        console.log(msg);
        return res.status(503).json(
          formatResponse(
            503,
            'Таблица кодов сброса не создана. В каталоге server выполните: npm run migrate',
          ),
        );
      }

      console.log('======== AuthController.forgotPassword =========');
      console.log(msg);
      if (error?.stack) console.log(error.stack);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при отправке кода'));
    }
  }

  /** Проверка кода; при успехе выдаётся resetToken (JWT ~15 мин) для смены пароля. */
  static async verifyResetCode(req, res) {
    try {
      const rawEmail = req.body?.email;
      const rawCode = req.body?.code;
      const email =
        typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : '';
      const code = typeof rawCode === 'string' ? rawCode : '';

      if (!email || !User.validateEmail(email)) {
        return res
          .status(400)
          .json(formatResponse(400, 'Укажите корректный email'));
      }

      const userId = await PasswordResetService.verifyCode(email, code);
      const resetToken = signPasswordResetToken(userId);

      return res.status(200).json(
        formatResponse(200, 'Код подтверждён', { resetToken }),
      );
    } catch (error) {
      if (
        error.message === 'INVALID_CODE' ||
        error.message === 'INVALID_INPUT'
      ) {
        return res
          .status(400)
          .json(
            formatResponse(
              400,
              'Неверный или просроченный код',
              null,
              error.message,
            ),
          );
      }
      console.log('======== AuthController.verifyResetCode =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при проверке кода'));
    }
  }

  /** Смена пароля по resetToken из verify-reset-code. */
  static async resetPasswordWithToken(req, res) {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || typeof newPassword !== 'string') {
        return res
          .status(400)
          .json(formatResponse(400, 'Недостаточно данных для смены пароля'));
      }

      let userId;
      try {
        userId = verifyPasswordResetToken(resetToken);
      } catch {
        return res
          .status(400)
          .json(
            formatResponse(
              400,
              'Сессия сброса недействительна или истекла. Запросите код снова.',
            ),
          );
      }

      if (!User.validatePassword(newPassword)) {
        return res
          .status(400)
          .json(
            formatResponse(
              400,
              'Пароль не соответствует требованиям: минимум 8 символов, заглавная и строчная буквы, цифра и спецсимвол.',
            ),
          );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const [updated] = await User.update(
        { password: hashedPassword },
        { where: { id: userId } },
      );

      if (!updated) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пользователь не найден'));
      }

      return res
        .status(200)
        .json(formatResponse(200, 'Пароль успешно изменён'));
    } catch (error) {
      console.log('======== AuthController.resetPasswordWithToken =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при смене пароля'));
    }
  }

  static async refreshTokens(req, res) {
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

      const remember = Boolean(res.locals.rememberMe);
      const { accessToken, refreshToken } = generateTokens(
        { user },
        { rememberMe: remember },
      );

      return res
        .status(200)
        .cookie('refreshToken', refreshToken, getRefreshCookieConfig(remember))
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
  }
}

module.exports = AuthController;
