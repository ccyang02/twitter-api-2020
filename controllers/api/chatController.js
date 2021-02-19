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
  },
  getPrivateLastMsgAndTime: async (req, res, next) => {
    try {
      const lastMessage = await sequelize.query(`
        SELECT m1.ChannelId AS channelId, m1.message AS lastMsg, 
               UNIX_TIMESTAMP(m1.createdAt) * 1000 AS lastMsgTime, 
               users.id AS userId, users.name, users.account, users.avatar 
        FROM (
          SELECT ChannelId, MAX(id) AS id
          FROM messages
          WHERE ChannelId NOT IN (0)
          group by ChannelId
        ) AS m2
        LEFT JOIN Messages AS m1
        ON m1.id = m2.id
        LEFT JOIN users
        ON m1.UserId = users.id;
      `, { type: Sequelize.QueryTypes.SELECT })

      return res.json(lastMessage)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = chatController