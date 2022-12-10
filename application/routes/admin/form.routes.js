// TODO:: This route file should be removed
const express = require('express')
require('express-group-routes')
const router = express.Router()
const formsController = require('../../controller/admin/forms.controller')

router.group('/', (router) => {
    // Contact forms
    router.group('/contact', (router) => {
        router.get('/', formsController.contactFormList)
    })

    router.group('/birthday', (router) => {
        router.get('/', formsController.birthdayFormList)
    })
})

module.exports = router
