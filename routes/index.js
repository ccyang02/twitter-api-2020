const express = require('express')
const router = express.Router()
const apis = require('./apis.js')

router.use('/api', apis)

module.exports = router