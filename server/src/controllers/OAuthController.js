const formatResponse = require('../utils/formatResponse');
const generateTokens = require('../utils/generateTokens');
const { getRefreshCookieConfig } = require('../config/cookieConfig');
const OAuthService = require('../services/OAuthService');
const { OAuthHttpError } = require('../services/OAuthService');

const KNOWN_OAUTH_CODES = new Set([
  'GOOGLE_USERINFO',
  'GOOGLE_PROFILE',
  'GOOGLE_IDTOKEN',
  'GOOGLE_EMAIL',
  'GOOGLE_CLIENT_MISSING',
  'GOOGLE_NO_INPUT',
  'GITHUB_USER',
  'GITHUB_EMAIL',
  'GITHUB_NO_INPUT',
]);

class OAuthController {
  /** Вход через Google или GitHub (access_token → профиль). */
  static async oauthLogin(req, res) {
    const provider = OAuthService.normalizeProvider(req.body?.provider);
    if (!provider) {
      return res
        .status(400)
        .json(formatResponse(400, 'Укажите provider: google или github'));
    }

    const remember = Boolean(req.body.rememberMe);

    try {
      const user = await OAuthService.loginOrRegister({
        provider,
        body: req.body,
      });

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
      if (error instanceof OAuthHttpError) {
        return res
          .status(error.status)
          .json(formatResponse(error.status, error.publicMessage));
      }

      const code = error?.message;
      if (KNOWN_OAUTH_CODES.has(code)) {
        console.log('======== OAuthController.oauthLogin =========', code);
        const { status, message } = OAuthService.mapErrorToHttp(code, provider);
        return res.status(status).json(formatResponse(status, message));
      }

      console.log('======== OAuthController.oauthLogin =========');
      console.log(error?.message || error);
      const { status, message } = OAuthService.mapErrorToHttp(code, provider);
      return res.status(status).json(formatResponse(status, message));
    }
  }

  /** Совместимость: запросы без поля provider. */
  static async googleLogin(req, res) {
    req.body = { ...req.body, provider: 'google' };
    return OAuthController.oauthLogin(req, res);
  }
}

module.exports = OAuthController;
