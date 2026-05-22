/**
 * Зона ответственности: Вадим (регистрация и вход). Остальные не развивают этот сервис без договорённости.
 */
const { User } = require('../db/models');
const { sanitizeAvatarUrl } = require('../utils/avatarFiles');

class AuthService {
  static async findUserByEmail(email) {
    return (await User.findOne({ where: { email } }))?.get();
  }

  static async findUserByUsername(username) {
    const u = String(username).toLowerCase().trim();
    return (await User.findOne({ where: { username: u } }))?.get();
  }

  static async findUserByGoogleSub(googleSub) {
    if (!googleSub || typeof googleSub !== 'string') return null;
    return (await User.findOne({ where: { google_sub: googleSub } }))?.get();
  }

  static async findUserByGithubSub(githubSub) {
    if (!githubSub || typeof githubSub !== 'string') return null;
    return (await User.findOne({ where: { github_sub: githubSub } }))?.get();
  }

  /**
   * Уникальный username для OAuth: из локальной части email или по sub.
   */
  static async allocateUsernameForGoogle(email, googleSub) {
    const sub = String(googleSub || '').replace(/[^a-zA-Z0-9_]/g, '').slice(-24);
    const local = String(email || '').split('@')[0] || 'user';
    let base = local.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 24);
    if (base.length < 3 || !/[a-zA-Z]/.test(base)) {
      base = `g_${sub || 'user'}`.slice(0, 24);
    }
    if (!User.validateUsername(base)) {
      base = `user_${sub.slice(-20) || 'oauth'}`.slice(0, 24);
    }
    for (let i = 0; i < 80; i += 1) {
      const suffix = i === 0 ? '' : `_${i}`;
      const candidate = (base + suffix).slice(0, 30);
      if (!User.validateUsername(candidate)) continue;
      const taken = await this.findUserByUsername(candidate);
      if (!taken) return candidate;
    }
    const fallback = `u_${Date.now()}`.slice(0, 30);
    return fallback;
  }

  /** Username для GitHub: login или gh_<id>. */
  static async allocateUsernameForGithub(login, githubNumericId) {
    const idPart = String(githubNumericId || '').replace(/\D/g, '').slice(-20);
    let base = String(login || '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase()
      .slice(0, 24);
    if (base.length < 3 || !/[a-zA-Z]/.test(base)) {
      base = `gh_${idPart || 'user'}`.slice(0, 24);
    }
    if (!User.validateUsername(base)) {
      base = `gh_${idPart || 'oauth'}`.slice(0, 24);
    }
    for (let i = 0; i < 80; i += 1) {
      const suffix = i === 0 ? '' : `_${i}`;
      const candidate = (base + suffix).slice(0, 30);
      if (!User.validateUsername(candidate)) continue;
      const taken = await this.findUserByUsername(candidate);
      if (!taken) return candidate;
    }
    return `gh_${Date.now()}`.slice(0, 30);
  }

  static async createUser(userData) {
    return (await User.create(userData)).get();
  }

  /** @returns {Promise<boolean>} true если строка удалена */

  static async sanitizePublicUser(userRow) {
    if (!userRow) return null;

    const user = userRow.get ? userRow.get() : userRow;
    const safeAvatarUrl = sanitizeAvatarUrl(user.avatarUrl);

    if (user.avatarUrl && !safeAvatarUrl && user.id) {
      await User.update({ avatarUrl: null }, { where: { id: user.id } });
    }

    return { ...user, avatarUrl: safeAvatarUrl };
  }

  static async findPublicUserById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    return this.sanitizePublicUser(user);
  }

  static async updateUserProfileById(id, profileData) {
    await User.update(profileData, { where: { id } });

    return this.findPublicUserById(id);
  }

  static async deleteUserById(id) {
    const row = await User.findByPk(id);
    if (!row) return false;

    const { isProtectedMockAdmin } = require('../utils/protectedUsers');
    if (isProtectedMockAdmin(row)) {
      const err = new Error('PROTECTED_MOCK_ADMIN');
      err.code = 'PROTECTED_MOCK_ADMIN';
      throw err;
    }

    const n = await User.destroy({ where: { id } });
    return n > 0;
  }
}

module.exports = AuthService;
