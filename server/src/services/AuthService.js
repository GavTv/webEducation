const { User } = require('../db/models');

class AuthService {
  static async findUserByEmail(email) {
    return (await User.findOne({ where: { email } }))?.get();
  }

  static async createUser(userData) {
    return (await User.create(userData)).get();
  }
}

module.exports = AuthService;
