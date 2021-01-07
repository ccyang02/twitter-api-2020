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

function promisedPassportAuthentication(fakeReq) {
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, (error, user, info) => {
      if (!user) {
        reject('you are not the guy!')
      }
      if (user) {
        resolve(user)
      }
    })(fakeReq, {})
  })
}

module.exports = async (io) => {
  // io.use(authenticated)

  io.on('connection', async (socket) => {
    const fakeReq = { headers: { authorization: `Bearer ${socket.handshake.auth.token}` }, url: 'https://sean-yu-pohsiang.github.io/simple-twitter-frontend-2020' }

    console.log('This is fake request!', fakeReq)
    console.log(socket)
    console.log('==============================')
    // let auser;
    // try {
    //   await passport.authenticate('jwt', { session: false }, (error, user, info) => {
    //     // if (error) return next(error)
    //     if (error) console.log('======> Error!!!!', error)
    //     if (!user) {
    //       console.log('Disconnect this socket: ', socket.id)
    //       socket.disconnect(true)
    //     }
    //     if (user) console.log('======= I got u!!', user)
    //     socket.user = user
    //     auser = user
    //   })(fakeReq, {})
    // } catch (error) {
    //   console.log(`>>>> passport error: `, error)
    // }
    // console.log('123: ', auser)
    // console.log(`Wanna get user!! ${socket.user}`)

    let getsomeuser;
    try {
      getsomeuser = await promisedPassportAuthentication(fakeReq)
    } catch (error) {
      console.log('Bad things happen :(', error)
    }
    console.log('Get promise!!!!!', getsomeuser)


    // const token = socket.handshake.auth.token
    // console.log(`Get socket ${socket.id}`)
    // console.log(`a user connected: ${token}`)

    socket.on('test-message', (username) => {
      console.log(`>>>>>>>> This is username from frontend. ${username}`)
    })

    socket.on('disconnect', async () => {
      console.log(`======> Detect disconnect: ${socket.id}`)
    })
  })
}