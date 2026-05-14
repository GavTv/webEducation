/** Правила как на сервере (User model), для мгновенной проверки на клиенте */

const EMAIL_FORMAT_MSG =
  "Укажите корректный email в формате name@domain.com (латиница, «@», точка в домене)";

const USERNAME_FORMAT_MSG =
  "3–30 символов: только английские буквы, цифры и _; нужна хотя бы одна буква";

export const PASSWORD_RULES_MSG =
  "Пароль: не менее 8 символов, заглавная и строчная буква, цифра и спецсимвол (!@#$…)";

export function validateRegisterEmailFormat(email: string): boolean {
  const e = email.toLowerCase().trim();
  if (!e) return false;
  return /^[a-z0-9][a-z0-9._%+-]*@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(e);
}

export function getRegisterEmailFormatError(email: string): string | null {
  const t = email.trim();
  if (!t) return "Введите email";
  if (!validateRegisterEmailFormat(t)) return EMAIL_FORMAT_MSG;
  return null;
}

export function validateRegisterUsernameFormat(username: string): boolean {
  const u = username.trim();
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(u)) return false;
  if (!/[a-zA-Z]/.test(u)) return false;
  return true;
}

export function getRegisterUsernameFormatError(username: string): string | null {
  const t = username.trim();
  if (!t) return "Введите имя пользователя";
  if (!validateRegisterUsernameFormat(t)) return USERNAME_FORMAT_MSG;
  return null;
}

export function validateRegisterPasswordRules(password: string): boolean {
  const hasUpperCase = /[A-Z]/;
  const hasLowerCase = /[a-z]/;
  const hasDigits = /\d/;
  const hasSpecialSymbols = /[!@#$%^&*()-+,.""<>{}]/;
  if (password.length < 8) return false;
  if (
    !hasUpperCase.test(password) ||
    !hasLowerCase.test(password) ||
    !hasDigits.test(password) ||
    !hasSpecialSymbols.test(password)
  ) {
    return false;
  }
  return true;
}

export function getRegisterPasswordError(password: string): string | null {
  if (!password) return "Введите пароль";
  if (!validateRegisterPasswordRules(password)) return PASSWORD_RULES_MSG;
  return null;
}

export function getRegisterNameError(name: string): string | null {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return "Введите имя и фамилию";
  }
  return null;
}

export function getRegisterConfirmError(
  password: string,
  confirm: string,
): string | null {
  if (!confirm) return "Подтвердите пароль";
  if (password !== confirm) return "Пароли не совпадают";
  return null;
}
