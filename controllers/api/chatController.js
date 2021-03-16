const { User, Message, Read, Sequelize, sequelize } = require('../../models')
const { Op } = Sequelize
const helpers = require('../../_helpers.js')


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
      const userId = helpers.getUser(req).id
      const channelList = await sequelize.query(`
        SELECT Channels.id
        FROM Channels
        WHERE Channels.UserOne = :uid OR Channels.UserTwo = :uid;
      `, { type: sequelize.QueryTypes.SELECT, replacements: { uid: userId } })
      const channelIds = channelList.map(element => element.id)

      // for a brand new user who did not have any private rooms
      if (channelList.length == 0) return res.json([])

      let lastMessage = await sequelize.query(`
        SELECT m1.ChannelId AS channelId, m1.UserId AS chattedUserId, m1.message AS lastMsg, 
            UNIX_TIMESTAMP(m1.createdAt) * 1000 AS lastMsgTime, 
            userone.id AS userOneId, userone.name AS userOneName, userone.account AS userOneAccount, userone.avatar AS userOneAvatar,
            usertwo.id AS userTwoId, usertwo.name AS userTwoName, usertwo.account AS userTwoAccount, usertwo.avatar AS userTwoAvatar
        FROM (
          SELECT ChannelId, MAX(id) AS id
          FROM Messages
          WHERE ChannelId IN (:channelIds)
          group by ChannelId
        ) AS m2
        LEFT JOIN Messages AS m1
        ON m1.id = m2.id
        LEFT JOIN Channels
        ON Channels.id = m2.ChannelId
        LEFT JOIN Users AS userone
        ON Channels.UserOne = userone.id
        LEFT JOIN Users AS usertwo
        ON Channels.UserTwo = usertwo.id;
      `, { type: Sequelize.QueryTypes.SELECT, replacements: { channelIds: channelIds } })

      // get the other user
      lastMessage = lastMessage.map(message => {
        const userPrefix = message.userOneId !== userId ? 'userOne' : 'userTwo'
        return {
          channelId: message.channelId, chattedUserId: message.chattedUserId,
          lastMsg: message.lastMsg, lastMsgTime: message.lastMsgTime,
          chatTo: {
            userId: message[userPrefix + 'Id'],
            name: message[userPrefix + 'Name'],
            account: message[userPrefix + 'Account'],
            avatar: message[userPrefix + 'Avatar']
          }
        }
      })

      return res.json(lastMessage)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = chatController