const passport = require('./config/passport')
const { Message, Read, Channel, sequelize } = require('./models')
const { getConnectedUsers } = require('./controllers/socket/public.js')
const channel = require('./models/channel')
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
      if (!onlineUsers[id].length) {
        io.emit('user-on-off-line', {
          status: 'on',
          account: socket.user.account,
          id: socket.user.id,
          name: socket.user.name,
          avatar: socket.user.avatar
        })
      }
      onlineUsers[id].push(socket)

      socket.on('test-message', (username) => {
        console.log(`>>>>>>>> This is username from frontend. ${username}`)
      })

      socket.on('init-public', async (time) => {
        console.log(`${new Date(time).toISOString()}: A user open public room (userId: ${id} name: ${name})`)
        getConnectedUsers(io, onlineUsers)
      })

      socket.on('message-read-timestamp', async (packet) => {
        const { channelId, time } = packet
        const { id } = socket.user

        const output = await Read.update({ 'date': new Date(parseInt(time)) }, { where: { 'UserId': id, 'ChannelId': channelId } })
        if (output[0] === 0) {
          // if there is no record about this user
          await Read.create({ 'UserId': id, 'ChannelId': channelId, 'date': new Date(parseInt(time)) })
        }
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

      socket.on('private-message', async (packet) => {
        const { message, time, channelId, sentToUserId } = packet
        const { account, avatar, id, name } = socket.user
        try {
          //save to database
          let channelIdFound = await sequelize.query(`
          SELECT id FROM Channels
          WHERE (UserOne = id AND UserTwo = :sentToUserId) OR
                (UserTwo = id AND UserOne = :sentToUserId) OR
                id = :channelId
        `, { type: sequelize.QueryTypes.SELECT, replacements: { channelId, sentToUserId} })
          if (channelId !== -1 && !channelIdFound) return res.status(400).message('channelId not found')
          if (channelId === -1 && !channelIdFound) {
            const channel = await Channel.create({ UserTwo: id, UserOne: sentToUserId })
          }
          const msg = await Message.create({
            ChannelId: channelIdFound || channel.id, UserId: id, message: String(message)
          })
          msg.changed('createdAt', true)
          msg.set('createdAt', new Date(parseInt(time)), { raw: true })
          await msg.save({ silent: true })

          //open room and broadcast message
          

        } catch (error) {
          console.log('Error on private-message: ', error)
        }
        
      })
      socket.on('disconnect', () => {
        console.log(`Get disconnected socket. (socketId: ${socket.id} account: ${account})`)
        onlineUsers[id].splice(onlineUsers[id].find(_socket => _socket.id === socket.id).id, 1)
        if (!onlineUsers[id].length) {
          delete onlineUsers[id]
          getConnectedUsers(io, onlineUsers)
          io.emit('user-on-off-line', { status: 'off', account, id, name, avatar })
          console.log(`A user disconnected (userId: ${id} account: ${account})`)
        }
      })
    } catch (error) {
      console.log(error)
      socket.emit('error', 'Internal error occurs, please try again later.')
    }
  })
}
