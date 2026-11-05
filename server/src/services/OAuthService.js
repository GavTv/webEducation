/**
 * OAuth Google / GitHub: профиль провайдера и вход/регистрация пользователя.
 */
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../db/models');
const AuthService = require('./AuthService');

class OAuthHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'OAuthHttpError';
    this.status = status;
    this.publicMessage = message;
  }
}

class OAuthService {
  static async resolveGoogleProfile(body) {
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

  static async resolveGithubProfile(accessToken) {
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

  static normalizeProvider(providerRaw) {
    const provider =
      typeof providerRaw === 'string'
        ? String(providerRaw).toLowerCase().trim()
        : '';
    if (provider !== 'google' && provider !== 'github') {
      return null;
    }
    return provider;
  }

  /**
   * @returns {Promise<object>} пользователь без поля password
   */
  static async loginOrRegister({ provider, body }) {
    let sub;
    let email;
    let name;
    let githubLogin;

    if (provider === 'google') {
      const p = await OAuthService.resolveGoogleProfile(body);
      ({ sub, email, name } = p);
    } else {
      const p = await OAuthService.resolveGithubProfile(body.accessToken);
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
      if (provider === 'google') {
        if (user.google_sub && user.google_sub !== sub) {
          throw new OAuthHttpError(403, 'Аккаунт привязан к другому Google');
        }
        if (!user.google_sub) {
          await User.update({ google_sub: sub }, { where: { id: user.id } });
          user = { ...user, google_sub: sub };
        }
      } else {
        if (user.github_sub && user.github_sub !== sub) {
          throw new OAuthHttpError(403, 'Аккаунт привязан к другому GitHub');
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
    return user;
  }

  static mapErrorToHttp(code, provider) {
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
    const mapped = map[code];
    if (mapped) {
      return { status: mapped[0], message: mapped[1] };
    }
    return {
      status: 401,
      message:
        provider === 'github'
          ? 'Не удалось войти через GitHub'
          : 'Не удалось войти через Google',
    };
  }
}

module.exports = OAuthService;
module.exports.OAuthHttpError = OAuthHttpError;
