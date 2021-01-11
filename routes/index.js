const express = require('express')
const router = express.Router()
const apis = require('./apis.js')

router.use('/api', apis)
router.get('/', (req, res) => res.send('Welcome to simple twitter backend service!'))


module.exports = router