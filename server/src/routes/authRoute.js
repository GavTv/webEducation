const authRouter = require('express').Router();
const AuthController = require('../controllers/AuthController');
const verifyRefreshToken = require('../middleware/verifyRefreshToken');
const verifyAccessToken = require('../middleware/verifyAccessToken');

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
  .post('/oauth', AuthController.oauthLogin)
  .post('/google', AuthController.googleLogin)
  .post('/logout', AuthController.logout)
  .post('/forgot-password', AuthController.forgotPassword)
  .post('/verify-reset-code', AuthController.verifyResetCode)
  .post('/reset-password', AuthController.resetPasswordWithToken)
  .delete('/me', verifyAccessToken, AuthController.deleteAccount)
  .get('/refresh', verifyRefreshToken, AuthController.refreshTokens);

module.exports = authRouter;
