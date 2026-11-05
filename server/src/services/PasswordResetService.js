const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { PasswordResetCode } = require('../db/models');
const AuthService = require('./AuthService');
const MailService = require('./MailService');

const CODE_TTL_MS = 10 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || '')
    .toLowerCase()
    .trim();
}

function generateSixDigitCode() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

class PasswordResetService {
  /**
   * Создаёт код, сохраняет с TTL, шлёт письмо. Если пользователя нет — тихий успех.
   * @param {string} rawEmail
   */
  static async requestCode(rawEmail) {
    const email = normalizeEmail(rawEmail);
    if (!email) {
      return { sent: false, reason: 'empty' };
    }

    const user = await AuthService.findUserByEmail(email);
    if (!user) {
      return { sent: false, reason: 'no_user' };
    }

    await PasswordResetCode.destroy({ where: { email } });

    const plainCode = generateSixDigitCode();
    const codeHash = await bcrypt.hash(plainCode, 10);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    const row = await PasswordResetCode.create({
      email,
      codeHash,
      expiresAt,
    });

    try {
      await MailService.sendPasswordResetCode({ to: email, code: plainCode });
    } catch (err) {
      await row.destroy();
      throw err;
    }

    return { sent: true };
  }

  /**
   * Проверяет код, удаляет запись, возвращает userId для выпуска reset JWT.
   * @param {string} rawEmail
   * @param {string} rawCode
   * @returns {Promise<number>}
   */
  static async verifyCode(rawEmail, rawCode) {
    const email = normalizeEmail(rawEmail);
    const code = String(rawCode || '').replace(/\D/g, '').slice(0, 6);
    if (!email || code.length !== 6) {
      throw new Error('INVALID_INPUT');
    }

    const user = await AuthService.findUserByEmail(email);
    if (!user) {
      throw new Error('INVALID_CODE');
    }

    const row = await PasswordResetCode.findOne({
      where: { email },
      order: [['createdAt', 'DESC']],
    });

    if (!row || new Date(row.expiresAt) < new Date()) {
      throw new Error('INVALID_CODE');
    }

    const ok = await bcrypt.compare(code, row.codeHash);
    if (!ok) {
      throw new Error('INVALID_CODE');
    }

    await PasswordResetCode.destroy({ where: { email } });
    return user.id;
  }
}

module.exports = PasswordResetService;
