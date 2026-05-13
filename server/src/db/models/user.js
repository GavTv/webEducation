'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      if (models.Task) {
        User.hasMany(models.Task, { foreignKey: 'user_id', as: 'tasks' });
      }
    }

    static validateEmail(email) {
      const emailPattern = /^[A-z0-9!-_%.]+@[A-z0-9.-]+\.[A-z]{2,}$/;
      return emailPattern.test(email);
    }

    static validatePassword(password) {
      const hasUpperCase = /[A-Z]/;
      const hasLowerCase = /[a-z]/;
      const hasDigits = /\d/;
      const hasSpecialSymbols = /[!@#$%^&*()-+,.""<>{}]/;
      const isValidLength = password.length >= 8;

      if (
        !hasUpperCase.test(password) ||
        !hasLowerCase.test(password) ||
        !hasDigits.test(password) ||
        !hasSpecialSymbols.test(password) ||
        !isValidLength
      ) {
        return false;
      }
      return true;
    }

    static validateRegistrationData(userData) {
      const { name, email, password } = userData;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return { isValid: false, error: 'Некорректное имя пользователя' };
      }

      if (
        !email ||
        typeof email !== 'string' ||
        email.trim().length === 0 ||
        !this.validateEmail(email)
      ) {
        return {
          isValid: false,
          error: 'Некорректный адрес электронной почты',
        };
      }

      if (
        !password ||
        typeof password !== 'string' ||
        password.trim().length === 0 ||
        !this.validatePassword(password)
      ) {
        return {
          isValid: false,
          error: 'Пароль не соответствует критериям валидации',
        };
      }

      return { isValid: true, error: null };
    }

    static validateLoginData(userData) {
      const { email, password } = userData;

      if (
        !email ||
        typeof email !== 'string' ||
        email.trim().length === 0 ||
        !this.validateEmail(email)
      ) {
        return {
          isValid: false,
          error: 'Некорректный адрес электронной почты',
        };
      }

      if (
        !password ||
        typeof password !== 'string' ||
        password.trim().length === 0 ||
        !this.validatePassword(password)
      ) {
        return {
          isValid: false,
          error: 'Пароль не соответствует критериям валидации',
        };
      }

      return { isValid: true, error: null };
    }
  }

  User.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      hooks: {
        beforeCreate: (newUser) => {
          newUser.email = newUser.email.toLowerCase().trim();
        },
      },
    },
  );

  return User;
};
