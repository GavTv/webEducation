const AuthService = require('../services/AuthService');
const formatResponse = require('../utils/formatResponse');
const { User } = require('../db/models');
const bcrypt = require('bcrypt');
const generateTokens = require('../utils/generateTokens');
const {
  getRefreshCookieConfig,
  clearRefreshCookie,
} = require('../config/cookieConfig');

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
      // Сравниваем хэши паролей
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

  static async refreshTokens(req, res) {
    // Достаём данные о пользователе из res.locals (их туда положила мидлварка verifyRefreshToken)

    const { user, rememberMe } = res.locals;

    try {
      const { accessToken, refreshToken } = generateTokens(
        { user },
        { rememberMe },
      );

      return res
        .status(200)
        .cookie(
          'refreshToken',
          refreshToken,
          getRefreshCookieConfig(rememberMe),
        )
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
        .json(formatResponse(500, 'Ошибка сервера при продлении сессии'));
    }
  }
}

module.exports = AuthController;
