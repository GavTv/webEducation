const authRouter = require('express').Router();
const AuthController = require('../controllers/AuthController');
const verifyRefreshToken = require('../middleware/verifyRefreshToken');

authRouter
  .post('/register', AuthController.register)
  .post('/login', AuthController.login)
  .post('/logout', AuthController.logout)
  .get('/refresh', verifyRefreshToken, AuthController.refreshTokens);

module.exports = authRouter;