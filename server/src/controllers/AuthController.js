const AuthService = require('../services/AuthService');
const formatResponse = require('../utils/formatResponse');
const { User } = require('../db/models');
const bcrypt = require('bcrypt');
const generateTokens = require('../utils/generateTokens');
const cookieConfig = require('../config/cookieConfig');

class AuthController {
  static async register(req, res) {
    // Достаём данные для регистрации из тела запроса
    const { name, email, password } = req.body;

    // Проводим валидацию данных для регистрации
    const { isValid, error } = User.validateRegistrationData({
      name,
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

      if (existingUser) {
        return res
          .status(400)
          .json(formatResponse(400, 'Пользователь уже зарегистрирован'));
      }
      // Хэшируем пароль
      const hashedPassword = await bcrypt.hash(password, 10);

      // создаём нового пользователя
      const newUser = await AuthService.createUser({
        name,
        email,
        password: hashedPassword,
      });

      if (!newUser) {
        return res
          .status(500)
          .json(formatResponse(500, 'Ошибка при создании пользователя'));
      }
      // удаляем информацию о пароле перед ответом от сервера
      delete newUser.password;

      // генерируем токены
      const { accessToken, refreshToken } = generateTokens({ user: newUser });

      // формируем ответ
      return res
        .status(201)
        .cookie('refreshToken', refreshToken, cookieConfig)
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
    const { email, password } = req.body;

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

      // генерируем токены
      const { accessToken, refreshToken } = generateTokens({
        user: existingUser,
      });

      // формируем ответ
      return res
        .status(200)
        .cookie('refreshToken', refreshToken, cookieConfig)
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
        .clearCookie('refreshToken')
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

    const { user } = res.locals;

    try {
      // генерируем токены
      const { accessToken, refreshToken } = generateTokens({
        user,
      });

      // формируем ответ
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
        .json(formatResponse(500, 'Ошибка сервера при продлении сессии'));
    }
  }
}

module.exports = AuthController;
