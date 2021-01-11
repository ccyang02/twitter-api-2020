'use strict';
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    ChannelId: DataTypes.INTEGER,
    UserId: DataTypes.INTEGER,
    message: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Message'
  });
  Message.associate = function (models) {
    Message.belongsTo(models.User)
    Message.belongsTo(models.Channel)
  };
  return Message;
};