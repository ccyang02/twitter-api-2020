const db = require('../models')
const User = db.User
const { check, body, validationResult } = require('express-validator')
const helpers = require('../_helpers.js')

const registerRules = () => {
  return [
    check('account').exists({ checkFalsy: true }).withMessage('帳號不可為空'),
    check('name').exists({ checkFalsy: true }).withMessage('名稱不可為空'),
    check('account')
      .custom(async (account, { req }) => {
        const user = await User.findOne({ where: { account: account } })
        if (helpers.getUser(req)) {
          if (helpers.getUser(req).account === account) return true
        }
        if (user) {
          throw new Error('此帳號已被註冊過')
        }
        return true
      }),
    check('email').isEmail().withMessage('信箱格式錯誤'),
    check('email')
      .custom(async (email, { req }) => {
        const user = await User.findOne({ where: { email: email } })
        if (helpers.getUser(req)) {
          if (helpers.getUser(req).email === email) return true
        }
        if (user) {
          throw new Error('此信箱已被註冊過')
        }
        return true
      }),
    check('password').isLength({ min: 3, max: 8 }).withMessage('密碼錯誤：長度需界在 3-8 之間'),
    check('checkPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('密碼與驗證密碼不相符')
        }
        return true
      }),
  ]
}

const loginRules = () => {
  return [
    check('account').exists({ checkFalsy: true }).withMessage('帳號不可為空'),
    check('password').isLength({ min: 3, max: 8 }).withMessage('密碼錯誤：長度需界在 3-8 之間'),
    check('account')
      .custom(async (account) => {
        const user = await User.findOne({ where: { account } })
        if (!user) {
          throw new Error('此帳號尚未被註冊過，請先完成註冊程序')
        }
        if (user.role === 'admin') throw new Error('Unauthorized')
        return true
      }),
  ]
}

const profileRules = async (req, res, next) => {
  try {
    const accountSetting = () => Promise.all(registerRules().map(rule => rule.run(req)))
    const profileEdition = () => Promise.all([
      check('name').exists({ checkFalsy: true }).withMessage('名稱不可為空').run(req),
      check('introduction').isLength({ max: 100 }).withMessage('最多 100 字').run(req)
    ])
    if (req.body.page === 'setting') {
      await accountSetting()
      return next()
    }
    await profileEdition()
    return next()
  } catch (error) {
    next(error)
  }
}

const postTweetRules = () => {
  // it's for user posting a new tweets
  return [
    check('description').notEmpty().withMessage('發文內容不可為空'),

  ]
}

const validResultCheck = (req, res, next) => {
  const errorResults = validationResult(req)
  if (errorResults.isEmpty()) return next()

  const errors = errorResults.errors.map(error => error.msg)
  return res.status(400).json({ status: 'error', message: `${errors}` })
}


module.exports = {
  registerRules,
  loginRules,
  profileRules,
  postTweetRules,
  validResultCheck
}

