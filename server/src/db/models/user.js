'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      if (models.Task) {
        User.hasMany(models.Task, { foreignKey: 'user_id', as: 'tasks' });
      }
      if (models.Room) {
        User.hasMany(models.Room, {
          foreignKey: 'createdBy',
          as: 'createdRooms',
        });
      }
    }

    static validateEmail(email) {
      if (typeof email !== 'string' || !email.trim()) return false;
      const e = email.toLowerCase().trim();
      // имя@домен.зона — локаль и домен начинаются с латиницы/цифры, в домене есть точка, TLD ≥ 2 букв
      return /^[a-z0-9][a-z0-9._%+-]*@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(e);
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

    static validateUsername(username) {
      const u = String(username).trim();
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(u)) return false;
      if (!/[a-zA-Z]/.test(u)) return false;
      return true;
    }

    static validateRegistrationData(userData) {
      const { name, email, password, username } = userData;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return { isValid: false, error: 'Некорректное имя пользователя' };
      }

      if (
        !username ||
        typeof username !== 'string' ||
        username.trim().length === 0 ||
        !this.validateUsername(username.trim())
      ) {
        return {
          isValid: false,
          error:
            'Имя пользователя: 3–30 символов, только английские буквы, цифры и _; нужна хотя бы одна буква',
        };
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
        password.trim().length === 0
      ) {
        return {
          isValid: false,
          error: 'Введите пароль',
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
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      google_sub: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      github_sub: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      hooks: {
        beforeCreate: (newUser) => {
          newUser.email = newUser.email.toLowerCase().trim();
          if (newUser.username) {
            newUser.username = String(newUser.username).toLowerCase().trim();
          }
        },
      },
    },
  );

  return User;
};
