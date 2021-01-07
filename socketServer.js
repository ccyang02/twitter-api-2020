const passport = require('./config/passport')
const db = require('./models')

// function authenticated(socket, next) {
//   passport.authenticate('jwt', { session: false }, (error, user, info) => {
//     if (error) return next(error)
//     if (!user) return next(new Error('未被授權'))
//     if (user.role === 'admin') return next(new Error('未被授權'))
//     socket.request.user = user
//     return next()
//   })(socket.request, {}, next)
// }

module.exports = async (io) => {
  // io.use(authenticated)
  io.on('connection', async (socket) => {
    const fakeReq = { headers: { Authorization: `Bearer ${socket.handshake.auth.token}` } }

    console.log('This is fake request!', fakeReq)
    console.log(socket)
    console.log('==============================')
    passport.authenticate('jwt', { session: false }, (error, user, info) => {
      // if (error) return next(error)
      if (error) console.log('======> Error!!!!', error)
      if (!user) socket.disconnect(true)
      if (user) console.log('======= I got u!!', user)
      socket.request.user = user
    })(fakeReq, {})


    const token = socket.handshake.auth.token
    console.log(`Get socket ${socket.id}`)
    console.log(`a user connected: ${token}`)

    socket.on('test-message', (username) => {
      console.log(`>>>>>>>> This is username from frontend. ${username}`)
    })

    socket.on('disconnect', async () => {
      console.log(`======> Detect disconnect: ${socket.id}`)
    })
  })
}