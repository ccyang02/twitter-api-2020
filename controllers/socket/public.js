const { User, Sequelize } = require('../../models')
const { Op } = Sequelize
const userSelectedFields = ['id', 'account', 'name', 'avatar']

async function getConnectedUsers(io, onlineUsers) {
  try {
    console.log('>>>>> onlineUsers: ', onlineUsers)
    const connectedUserIds = Object.keys(onlineUsers).map(Number)
    const connectedUsers = await User.findAll({
      where: { id: { [Op.in]: connectedUserIds } },
      attributes: userSelectedFields,
      raw: true
    })

    connectedUsers.forEach((user, i) => {
      user.sckId = onlineUsers[user.id].map(socket => socket.id)
    })

    console.log('>>>> connectedUsers: ', connectedUsers)
    await io.emit('init-public', connectedUsers)
  } catch (error) {
    console.log(error)
    await io.emit('error', '更新在線使用者時發生錯誤')
  }
}


module.exports = { getConnectedUsers }