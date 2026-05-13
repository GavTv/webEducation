'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      Room.hasMany(models.Message, {
        foreignKey: 'roomId',
        as: 'messages',
      });
    }
  }

  Room.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('group', 'course'),
        defaultValue: 'group',
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Room',
    }
  );

  return Room;
};
