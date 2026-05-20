'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.Room, {
        foreignKey: 'roomId',
        as: 'room',
        onDelete: 'CASCADE',
      });
      Message.belongsTo(models.User, {
        foreignKey: 'senderId',
        as: 'sender',
      });
    }
  }

  Message.init(
    {
      roomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      senderRole: {
        type: DataTypes.ENUM('student', 'teacher', 'admin'),
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Message',
    }
  );

  return Message;
};
