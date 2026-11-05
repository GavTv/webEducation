/** Системный мок-админ из сида — нельзя удалять и менять роль. */
const DEFAULT_MOCK_ADMIN_EMAIL = 'taras@educhat.local';

function getMockAdminEmails() {
  const emails = new Set([DEFAULT_MOCK_ADMIN_EMAIL]);
  const fromEnv = process.env.ADMIN_USER_EMAIL || process.env.ADMIN_EMAIL;
  if (fromEnv && typeof fromEnv === 'string') {
    emails.add(fromEnv.toLowerCase().trim());
  }
  return emails;
}

function isProtectedMockAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return getMockAdminEmails().has(email.toLowerCase().trim());
}

function isProtectedMockAdmin(user) {
  if (!user) return false;
  const email = typeof user.get === 'function' ? user.get('email') : user.email;
  return isProtectedMockAdminEmail(email);
}

function protectedMockAdminMessage() {
  return 'Системного администратора (мок) нельзя удалить';
}

module.exports = {
  DEFAULT_MOCK_ADMIN_EMAIL,
  getMockAdminEmails,
  isProtectedMockAdminEmail,
  isProtectedMockAdmin,
  protectedMockAdminMessage,
};
