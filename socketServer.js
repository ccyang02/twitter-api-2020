const db = require('./models')


module.exports = async (io) => {
  io.on('connection', async (socket) => {
    const token = socket.handshake.auth.token
    console.log(`a user connected: ${token}`)

    socket.on('test-message', (username) => {
      console.log(`>>>>>>>> This is username from frontend. ${username}`)
    })
  })
}