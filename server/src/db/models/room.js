'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      Room.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
        onDelete: 'CASCADE',
      });
      Room.hasMany(models.Message, {
        foreignKey: 'roomId',
        as: 'messages',
      });
      if (models.RoomMember) {
        Room.hasMany(models.RoomMember, {
          foreignKey: 'roomId',
          as: 'members',
        });
      }
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
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      joinPasswordHash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      color: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'purple',
      },
    },
    {
      sequelize,
      modelName: 'Room',
    }
  );

  return Room;
};
