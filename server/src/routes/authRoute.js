const authRouter = require('express').Router();
const AuthController = require('../controllers/AuthController');
const verifyRefreshToken = require('../middleware/verifyRefreshToken');

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
  .post('/logout', AuthController.logout)
  .get('/refresh', verifyRefreshToken, AuthController.refreshTokens);

module.exports = authRouter;
