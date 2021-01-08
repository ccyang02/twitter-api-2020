const passport = require('./config/passport')
const db = require('./models')

function promisedVerifyToken(fakeReq) {
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, (error, user, info) => {
      if (error) reject({ status: 'error', message: `Passport internal error: ${error}` })
      if (!user) resolve({ status: 'fail', message: 'Authentication fail.' })
      if (user) resolve({ status: 'success', message: user })
    })(fakeReq, {})
  })
}

module.exports = async (io) => {
  io.on('connection', async (socket) => {
    // console.log(`a user connected: ${socket.handshake.auth.token}`)
    const fakeReq = {
      headers: { authorization: `Bearer ${socket.handshake.auth.token}` },
      url: 'https://sean-yu-pohsiang.github.io/simple-twitter-frontend-2020'
    }

    let authUser;
    try {
      authUser = await promisedVerifyToken(fakeReq)
      if (authUser.status === 'success') {
        socket.user = authUser.message
        // console.log(`Get socket ${socket.user.name}`) // id name account avatar
      } else {
        socket.emit('unauthorized', `unauthorized`)
        socket.disconnect(true)
      }
    } catch (error) {
      console.log(error)
      throw Error(error)
    }

    socket.on('test-message', (username) => {
      console.log(`>>>>>>>> This is username from frontend. ${username}`)
    })

    socket.on('disconnect', async () => {
      console.log('Get disconnected user.')
    })
  })
}