'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PasswordResetCode extends Model {}

  PasswordResetCode.init(
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      codeHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'PasswordResetCode',
      tableName: 'PasswordResetCodes',
    },
  );

  return PasswordResetCode;
};
