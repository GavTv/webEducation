'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RoomMember extends Model {
    static associate(models) {
      RoomMember.belongsTo(models.Room, {
        foreignKey: 'roomId',
        as: 'room',
      });
      RoomMember.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  RoomMember.init(
    {
      roomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'RoomMember',
      tableName: 'RoomMembers',
    },
  );

  return RoomMember;
};
