const bcrypt = require('bcrypt');
const formatResponse = require('../utils/formatResponse');
const { User } = require('../db/models');
const PasswordResetService = require('../services/PasswordResetService');
const {
  signPasswordResetToken,
  verifyPasswordResetToken,
} = require('../utils/passwordResetJwt');

class PasswordResetController {
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
        console.log(msg);
        return res.status(503).json(
          formatResponse(
            503,
            'Таблица кодов сброса не создана. В каталоге server выполните: npm run migrate',
          ),
        );
      }

      console.log(msg);
      if (error?.stack) console.error(error.stack);
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
      console.error(error);
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
      console.error(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при смене пароля'));
    }
  }
}

module.exports = PasswordResetController;
