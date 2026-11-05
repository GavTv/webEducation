const authRouter = require('express').Router();
const AuthController = require('../controllers/AuthController');
const OAuthController = require('../controllers/OAuthController');
const PasswordResetController = require('../controllers/PasswordResetController');
const verifyRefreshToken = require('../middleware/verifyRefreshToken');
const verifyAccessToken = require('../middleware/verifyAccessToken');
const uploadAvatar = require('../middleware/uploadAvatar');

authRouter
  .route('/check-email')
  .get(AuthController.checkEmailAvailability)
  .post(AuthController.checkEmailAvailability);

authRouter
  .route('/check-username')
  .get(AuthController.checkUsernameAvailability)
  .post(AuthController.checkUsernameAvailability);

authRouter
  .post('/register', AuthController.register)
  .post('/login', AuthController.login)
  .post('/oauth', OAuthController.oauthLogin)
  .post('/google', OAuthController.googleLogin)
  .post('/logout', AuthController.logout)
  .patch('/me', verifyAccessToken, uploadAvatar, AuthController.updateProfile)
  .post('/forgot-password', PasswordResetController.forgotPassword)
  .post('/verify-reset-code', PasswordResetController.verifyResetCode)
  .post('/reset-password', PasswordResetController.resetPasswordWithToken)
  .delete('/me', verifyAccessToken, AuthController.deleteAccount)
  .get('/refresh', verifyRefreshToken, AuthController.refreshTokens);

module.exports = authRouter;
