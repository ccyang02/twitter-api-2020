const { User, Message, Read, Sequelize, sequelize } = require('../../models')
const { Op } = Sequelize

const chatController = {
  getMessages: async (req, res, next) => {
    try {
      const { channelId, userId } = req.body
      const messages = await sequelize.query(`
        SELECT msg.id, msg.UserId, msg.ChannelId, msg.message, 
          users.name, users.account, users.avatar,
          UNIX_TIMESTAMP(msg.createdAt) * 1000 AS time
        FROM Messages as msg
        RIGHT JOIN Users as users 
        ON users.id = msg.UserId
        WHERE msg.ChannelId = :channelId
        ORDER BY msg.createdAt ASC;
      `, { type: sequelize.QueryTypes.SELECT, replacements: { channelId: channelId } })

      return res.json(messages)
    } catch (error) {
      next(error)
    }
  },
  getPublicUnread: async (req, res, next) => {
    try {
      const { userId } = req.body
      const read = await Read.findOne({ where: { 'UserId': userId, 'ChannelId': 0 } })

      // if it cannot be found in Read, that means this user never open public chatroom
      const lastTimestamp = read !== null ? read.date.getTime() : 0
      const count = await Message.count({ where: { 'ChannelId': 0, 'createdAt': { [Op.gt]: lastTimestamp } } })
      return res.json({ count })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = chatController