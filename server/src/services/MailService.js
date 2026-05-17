require('../utils/loadEnv')();
const nodemailer = require('nodemailer');

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      String(process.env.SMTP_HOST).trim() &&
      process.env.SMTP_USER &&
      String(process.env.SMTP_USER).trim() &&
      process.env.SMTP_PASS &&
      String(process.env.SMTP_PASS).trim(),
  );
}

function isGmailHost(host) {
  return typeof host === 'string' && host.toLowerCase().includes('gmail');
}

/**
 * Настройки для Gmail и типичного STARTTLS на 587.
 * @see https://nodemailer.com/smtp/well-known-services/
 */
function createTransport() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  let secure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1';

  /** @type {import('nodemailer').TransportOptions} */
  const options = {
    host,
    port,
    secure,
    auth: {
      user: String(process.env.SMTP_USER || '').trim(),
      pass: String(process.env.SMTP_PASS || '')
        .trim()
        .replace(/\s+/g, ''),
    },
    tls: {
      minVersion: 'TLSv1.2',
    },
  };

  if (isGmailHost(host)) {
    if (port === 587) {
      options.secure = false;
      options.requireTLS = true;
    }
    if (port === 465) {
      options.secure = true;
    }
  }

  return nodemailer.createTransport(options);
}

/** Отображаемый отправитель по умолчанию (можно переопределить SMTP_FROM). */
const DEFAULT_SMTP_FROM = 'EduChat <noreply@elbrusboot.camp>';

/**
 * Поле From: приоритет SMTP_FROM, иначе бренд + noreply@elbrusboot.camp.
 * Реальная доставка зависит от SMTP (например Gmail — см. .env.example).
 */
function resolveFromAddress() {
  const rawFrom = process.env.SMTP_FROM;
  if (rawFrom && String(rawFrom).trim()) {
    return String(rawFrom).trim();
  }
  return DEFAULT_SMTP_FROM;
}

/**
 * @param {{ to: string; code: string }} params
 */
async function sendPasswordResetCode({ to, code }) {
  const from = resolveFromAddress();

  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[MailService] SMTP не настроен (.env: SMTP_HOST, SMTP_USER, SMTP_PASS) — письмо не отправлялось. Код для ${to}: ${code}`,
      );
      return;
    }
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  try {
    const transporter = createTransport();
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Код восстановления пароля',
      text: `Ваш код: ${code}. Действует 10 минут.`,
      html: `<p>Здравствуйте!</p><p>Ваш код для сброса пароля: <strong>${code}</strong></p><p>Код действует <strong>10 минут</strong>.</p><p>Если вы не запрашивали сброс, проигнорируйте письмо.</p>`,
    });
    console.log(
      `[MailService] Отправлено на ${to}, messageId=${info.messageId ?? 'n/a'}`,
    );
  } catch (err) {
    const msg = err?.message || String(err);
    const resp = err?.response;
    console.error('[MailService] Ошибка SMTP:', msg, resp || '');
    const hint = isGmailHost(process.env.SMTP_HOST)
      ? ' Для Gmail: smtp.gmail.com, порт 587, SMTP_SECURE=false, пароль приложения (не обычный пароль аккаунта), SMTP_USER = полный email.'
      : '';
    throw new Error(`MAIL_SEND_FAILED: ${msg}${hint}`);
  }
}

module.exports = {
  sendPasswordResetCode,
  isSmtpConfigured,
};
