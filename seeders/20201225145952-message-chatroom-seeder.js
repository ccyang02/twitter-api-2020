'use strict';
const db = require('../models')
const User = db.User
const Channel = db.Channel

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {

      const users = await User.findAll({
        raw: true,
        nest: true,
        attributes: ['id', 'name', 'account', 'avatar']
      })

      const channels = await Channel.findAll({ raw: true, nest: true })
      const channelOne = channels[0]
      const channelTwo = channels[1]

      console.log(Math.floor(Math.random() * users.length))
      console.log(users[Math.floor(Math.random() * users.length)])

      const chats = [
        // public room
        {
          ChannelId: 0,
          UserId: (users[Math.floor(Math.random() * users.length)]).id,
          message: 'Anyone online?',
          createdAt: new Date(2020, 10, 10, 8, 0, 0),
          updatedAt: new Date(2020, 10, 10, 8, 0, 0)
        },
        {
          ChannelId: 0,
          UserId: (users[Math.floor(Math.random() * users.length)]).id,
          message: 'lalala',
          createdAt: new Date(2020, 10, 10, 9, 0, 0),
          updatedAt: new Date(2020, 10, 10, 9, 0, 0)
        },
        // private room
        {
          ChannelId: channelOne.id,
          UserId: channelOne.UserOne,
          message: 'Hi there',
          createdAt: new Date(2020, 10, 10, 10, 0, 0),
          updatedAt: new Date(2020, 10, 10, 10, 0, 0)
        },
        {
          ChannelId: channelOne.id,
          UserId: channelOne.UserTwo,
          message: '?',
          createdAt: new Date(2020, 10, 10, 10, 0, 30),
          updatedAt: new Date(2020, 10, 10, 10, 0, 30)
        },
        {
          ChannelId: channelOne.id,
          UserId: channelOne.UserOne,
          message: 'How ar u today?',
          createdAt: new Date(2020, 10, 10, 10, 1, 0),
          updatedAt: new Date(2020, 10, 10, 10, 1, 0)
        },
        {
          ChannelId: channelTwo.id,
          UserId: channelTwo.UserOne,
          message: 'Feel bored hang out 2gether?',
          createdAt: new Date(2020, 10, 10, 10, 30, 0),
          updatedAt: new Date(2020, 10, 10, 10, 30, 0)
        },
        {
          ChannelId: channelTwo.id,
          UserId: channelTwo.UserTwo,
          message: 'Nope, I need to prepare my exam.',
          createdAt: new Date(2020, 10, 10, 10, 31, 0),
          updatedAt: new Date(2020, 10, 10, 10, 31, 0)
        },
        {
          ChannelId: channelTwo.id,
          UserId: channelTwo.UserOne,
          message: 'okay :(',
          createdAt: new Date(2020, 10, 10, 10, 32, 0),
          updatedAt: new Date(2020, 10, 10, 10, 32, 0)
        },
      ]
      await queryInterface.bulkInsert('Messages', chats)
    } catch (error) {
      console.log(error)
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.bulkDelete('Messages', {})
    } catch (error) {
      console.log(error)
    }
  }
};
