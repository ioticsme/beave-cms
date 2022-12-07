const express = require('express')
require('express-group-routes')
const router = express.Router()
const customFormsController = require('../../controller/admin/customForm.controller')

router.group('/', (router) => {
    // Custom forms
    router.group('/', (router) => {
        router.get('/', customFormsController.list)
        router.get('/add', customFormsController.add)
        router.get('/edit/:id', customFormsController.edit)
        router.post('/save', customFormsController.save)
        router.post('/change-status', customFormsController.changeStatus) 
        router.post('/delete', customFormsController.deleteForm)
        router.get('/submissions/:id', customFormsController.viewSubmissions)
    })
})

module.exports = router
