const passport = require('./config/passport')
const { Message } = require('./models')
const { getConnectedUsers } = require('./controllers/socket/public.js')
const onlineUsers = {}

function authenticated(socket, next) {
  const fakeReq = {
    headers: { authorization: `Bearer ${socket.handshake.auth.token}` },
    url: 'https://sean-yu-pohsiang.github.io/simple-twitter-frontend-2020'
  }
  passport.authenticate('jwt', { session: false }, (error, user, info) => {
    if (error) return next(new Error(`Passport internal error: ${error}`))
    if (!user) return next(new Error('Authentication fail.'))
    if (user.role === 'admin') return next(new Error('Authentication fail.'))
    const { id, account, name, avatar } = user
    socket.user = { id, account, name, avatar }
    return next()
  })(fakeReq, {}, next)
}


module.exports = async (io) => {
  io.use(authenticated)
  io.on('connection', async (socket) => {
    try {
      const { id, account, name, avatar } = socket.user
      console.log(`Get connected socket (socketId: ${socket.id} name: ${name})`)
      //Update onlineUsers
      if (!onlineUsers[id]) {
        onlineUsers[id] = []
      }
      if (!onlineUsers[id].length) io.emit('online', socket.user)
      onlineUsers[id].push(socket.id)

      socket.on('test-message', (username) => {
        console.log(`>>>>>>>> This is username from frontend. ${username}`)
      })

      socket.on('init-public', async (time) => {
        console.log(`${new Date(time).toISOString()}: A user open public room (userId: ${id} name: ${name})`)
        getConnectedUsers(io, onlineUsers)
      })

      socket.on('public-message', async (packet) => {
        const { message, time } = packet
        const { account, avatar, id, name } = socket.user
        try {
          const msg = await Message.create({
            ChannelId: 0,
            UserId: id,
            message: message
          })

          msg.changed('createdAt', true)
          msg.set('createdAt', new Date(parseInt(time)), { raw: true })
          await msg.save({ silent: true })
        } catch (error) {
          console.log('Error on public-message: ', error)
        }
        io.emit('public-message', { account, avatar, userId: id, name, message, time })
      })

      socket.on('disconnect', () => {
        console.log(`Get disconnected socket. (socketId: ${id} name: ${name})`)
        onlineUsers[id].splice(onlineUsers[id].indexOf(socket.id), 1)
        if (!onlineUsers[id].length) {
          delete onlineUsers[id]
          io.emit('offline', { id, name })
          console.log(`A user disconnected (userId: ${id} name: ${name})`)
        }
      })
    } catch (error) {
      console.log(error)
      socket.emit('error', 'Internal error occurs, please try again later.')
    }
  })
}
