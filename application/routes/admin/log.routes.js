const express = require('express')
require('express-group-routes')
const router = express.Router()
const logController = require('../../controller/admin/log.controller')

router.group('/', (router) => {
    router.get('/files', logController.fileLogs)
})
// router.post('/', userController.verifyOtp)

module.exports = router
