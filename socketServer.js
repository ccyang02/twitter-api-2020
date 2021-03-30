const passport = require('./config/passport')
const { Message, Read, Channel, User, sequelize, Sequelize } = require('./models')
const { Op } = Sequelize
const { getConnectedUsers } = require('./controllers/socket/public.js')
const db = require('./models')
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

        try {
          if (channelId === -1) return
          const channelIsValid = await Channel.findOne({ where: { 
            id: channelId, 
            [Op.or]: [{ UserOne: id}, {UserTwo: id}]  
          }})
          if (!channelIsValid) throw new Error(`User is not in the channel`)
          
          const readFound = await Read.findOne({ where: { 'UserId': id, 'ChannelId': channelId } })
          if (!readFound) {
            // if there is no record about this user
            await Read.create({ 'UserId': id, 'ChannelId': channelId, 'date': new Date(parseInt(time)) })
          } else {
            await Read.update({ 'date': new Date(parseInt(time)) }, { where: { 'UserId': id, 'ChannelId': channelId } })
          }
          socket.emit('message-read-timestamp', { channelId })
        } catch(error) {
          console.log('Error on message-read-timestamp: ', error)
          socket.emit('error', 'Internal error occurs, please try again later.')
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
        const { message, time, channelId, receiverId, receiverName } = packet
        const { account, avatar, id: senderId, name } = socket.user
        let channelIdFound
        console.log(`>>>>> get private-message from ${name} (${senderId}): `, packet)
        try {
          //save to database 
          if ((receiverId && !parseInt(receiverId)) || !parseInt(channelId)) throw new Error('Invalid channelId or receiverId')

          //check and create new channel
          if (channelId !== -1) {
            const channelFound = await Channel.findByPk(channelId)
            if (!channelFound) throw new Error('channelId not found')
            channelIdFound = channelId
          } else if (receiverId) {
            const result = await sequelize.query(`
              SELECT id FROM Channels
              WHERE (UserOne = :senderId AND UserTwo = :receiverId) OR
                    (UserTwo = :senderId AND UserOne = :receiverId)
            `, { type: sequelize.QueryTypes.SELECT, replacements: { channelId, receiverId, senderId } })
            if (result.length) {
              channelIdFound = result[0].id
            } else {
              const userIdExist = await User.findByPk(receiverId)
              if (!userIdExist) throw new Error('User not found.')
              const channel = await Channel.create({ UserTwo: senderId, UserOne: receiverId })
              channelIdFound = channel.id
            }
            await socket.emit('private-update-channelId', { userId: receiverId, name: receiverName, channelId: channelIdFound })
          } else {
            throw new Error('ReceiverId is missing.')
          }
          
          //save message to db
          const msg = await Message.create({
            ChannelId: channelIdFound, UserId: senderId, message: String(message)
          })
          msg.changed('createdAt', true)
          msg.set('createdAt', new Date(parseInt(time)), { raw: true })
          await msg.save({ silent: true })

          //open room 
          onlineUsers[senderId].forEach(socket => socket.join(`room ${channelIdFound}`))
          try {
            onlineUsers[Number(receiverId)].forEach(socket => socket.join(`room ${channelIdFound}`))
          } catch (error) {
            console.log('Private message is sent but that user is not online.')
          }

          //broadcast message
          const responsePacket = { account, avatar, userId: senderId, name, message: String(message), time: parseInt(time), channelId: channelIdFound }
          console.log(`>>>>> broadcast private-message to room ${channelIdFound}: `, responsePacket)
          io.to(`room ${channelIdFound}`).emit('private-message', responsePacket)
        } catch (error) {
          console.log('Error on private-message: ', error)
          socket.emit('error', 'Internal error occurs, please try again later.')
        }
      })

      socket.on('disconnect', () => {
        console.log(`Get disconnected socket. (socketId: ${socket.id} account: ${account})`)
        onlineUsers[id].find((_socket, index) => {
          if (_socket.id !== socket.id) return false
          onlineUsers[id].splice(index, 1)
          return true
        })       
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
