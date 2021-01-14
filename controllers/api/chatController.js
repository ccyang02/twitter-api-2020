const db = require('../../models')
const Message = db.Message
const User = db.User
const sequelize = db.sequelize

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
  }
}

module.exports = chatController