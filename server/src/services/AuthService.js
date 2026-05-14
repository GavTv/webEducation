/**
 * Зона ответственности: Вадим (регистрация и вход). Остальные не развивают этот сервис без договорённости.
 */
const { User } = require('../db/models');

class AuthService {
  static async findUserByEmail(email) {
    return (await User.findOne({ where: { email } }))?.get();
  }

  static async findUserByUsername(username) {
    const u = String(username).toLowerCase().trim();
    return (await User.findOne({ where: { username: u } }))?.get();
  }

  static async createUser(userData) {
    return (await User.create(userData)).get();
  }
}

module.exports = AuthService;
