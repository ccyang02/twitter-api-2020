const chatController = {
  getPublicMsg: async (req, res, next) => {
    try {
      return res.json({ status: 'success', message: '' })
    } catch (error) {
      console.log(error)
    }
  }
}

module.exports = chatController