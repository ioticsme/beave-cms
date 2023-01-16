const express = require('express')
const router = express.Router()
require('express-group-routes')
const authController = require('../../controller/admin/auth.controller')

router.group('/', (router) => {
    router.get('/signup', authController.signup)
    router.post('/signup', authController.signupSubmit)
    router.get('/login', authController.login)
    router.post('/login', authController.loginSubmit)
    router.get('/logout', authController.logout)
    router.get('/forgot', authController.forgotCredentials)
})

module.exports = router
