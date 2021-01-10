const passport = require('./config/passport')
const db = require('./models')
const { getConnectedUsers } = require('./controllers/socket/public.js')
const onlineUsers = {}


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

    const { id, account, name, avatar } = socket.request.user
    const user = { id, account, name, avatar }

    //Update onlineUsers
    if (!onlineUsers[id]) {
      onlineUsers[id] = []
      io.emit('online', ...user)
    }
    onlineUsers[id].push(socket.id)

    socket.on('test-message', (username) => {
      console.log(`>>>>>>>> This is username from frontend. ${username}`)
    })

    socket.on('init-public', (time) => {
      console.log(`${new Date(time).toISOString()}: A user open public room (userId: ${id} name: ${name})`)
      getConnectedUsers(io, onlineUsers)
    })

    socket.on('disconnect', async () => {
      console.log('Get disconnected socket.')
      onlineUser[id].splice(online.User[id].indexOf(socket.id), 1)
      if (!onlineUser[id].length) {
        io.emit('offline', id)
        console.log(`A user disconnected (userId: ${id} name: ${name})`)
      }
    })
  })
}