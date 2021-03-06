const db = require('../../models')
const Tweet = db.Tweet
const Like = db.Like
const Reply = db.Reply

const sequelize = require('sequelize')
const helpers = require('../../_helpers.js')
const { getSimpleUserIncluded, isLiked } = require('../../modules/common')

const tweetController = {

  replyTweet: async (req, res, next) => {
    try {
      const tweetId = req.params.id
      const { comment, createdTimestamp } = req.body
      const reply = await Reply.create({
        UserId: helpers.getUser(req).id,
        TweetId: tweetId,
        comment: comment
      })

      if (createdTimestamp) {
        reply.changed('createdAt', true)
        reply.set('createdAt', new Date(parseInt(createdTimestamp)), { raw: true })
        await reply.save({ silent: true })
      }

      return res.json({ status: 'success', message: '' })
    } catch (error) {
      next(error)
    }
  },

  getReplies: async (req, res, next) => {
    try {
      const tweetId = req.params.id

      const replies = await Reply.findAll({
        raw: true,
        nest: true,
        where: { TweetId: tweetId },
        include: getSimpleUserIncluded(),
        order: [
          [sequelize.literal('createdAt'), 'DESC'],
        ],
      })
      replies.map(reply => {
        reply.createdAt = reply.createdAt.getTime()
        return reply
      })

      return res.json(replies)
    } catch (error) {
      next(error)
    }
  },

  likeTweet: async (req, res, next) => {
    try {
      const tweetId = req.params.id

      const isExisting = await Like.findOne({ where: { UserId: helpers.getUser(req).id, TweetId: tweetId } })
      if (!isExisting) {
        Like.create({
          UserId: helpers.getUser(req).id,
          TweetId: tweetId
        })
      }

      return res.json({ status: 'success', message: '' })
    } catch (error) {
      next(error)
    }
  },

  unlikeTweet: async (req, res, next) => {
    try {
      const tweetId = req.params.id
      const tweet = await Tweet.findByPk(tweetId)
      if (tweet) {
        await Like.destroy({ where: { UserId: helpers.getUser(req).id, TweetId: tweetId } })
      }
      return res.json({ status: 'success', message: 'Unlike successfully.' })
    } catch (error) {
      next(error)
    }
  },

  getTweet: async (req, res, next) => {
    try {
      const tweet = await Tweet.findByPk(req.params.id, {
        include: getSimpleUserIncluded(),
        attributes: {
          include: [
            [sequelize.literal('(SELECT COUNT(*) FROM Replies WHERE Replies.TweetId = Tweet.id)'), 'repliesCount'],
            [sequelize.literal('(SELECT COUNT(*) FROM Likes WHERE Likes.TweetId = Tweet.id)'), 'likesCount'],
            isLiked(req),
          ],
          exclude: ['updatedAt']
        }
      })
      if (!tweet) return res.status(400).json({ status: 'error', message: '沒有這則貼文' })
      const plainTweet = tweet.toJSON()
      plainTweet.createdAt = plainTweet.createdAt.getTime()
      plainTweet.isLiked = plainTweet.isLiked ? true : false
      return res.json(plainTweet)
    } catch (error) {
      next(error)
    }
  },

  postTweet: async (req, res, next) => {
    const { description, createdTimestamp } = req.body
    try {
      const tweet = await Tweet.create({
        UserId: helpers.getUser(req).id,
        description: description,
      })

      if (createdTimestamp) {
        // for add the frontend click datetime in the database
        tweet.changed('createdAt', true)
        tweet.set('createdAt', new Date(parseInt(createdTimestamp)), { raw: true })
        await tweet.save({ silent: true })
      }

      return res.json({ status: "success", message: "" })
    } catch (error) {
      next(error)
    }
  },

  getTweets: async (req, res, next) => {
    try {
      const rawTweets = await Tweet.findAll({
        raw: true,
        nest: true,
        include: getSimpleUserIncluded(),
        attributes: {
          include: [
            [sequelize.literal('(SELECT COUNT(*) FROM Replies WHERE Replies.TweetId = Tweet.id)'), 'repliesCount'],
            [sequelize.literal('(SELECT COUNT(*) FROM Likes WHERE Likes.TweetId = Tweet.id)'), 'likesCount'],
          ],
          exclude: ['updatedAt']
        },
        order: [
          [sequelize.literal('createdAt'), 'DESC'],
        ]
      })
      const likedTweets = await Like.findAll({
        raw: true,
        nest: true,
        where: { UserId: helpers.getUser(req).id },
        attributes: ['TweetId']
      })
      const tweets = rawTweets.map(t => ({
        ...t,
        createdAt: t.createdAt.getTime(),
        isLiked: likedTweets.map(element => element.TweetId).includes(t.id)
      }))

      return res.json(tweets)
    } catch (error) {
      next(error)
    }
  },
}

module.exports = tweetController