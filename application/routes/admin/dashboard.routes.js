const express = require('express')
require('express-group-routes')
const router = express.Router()
const dashboardController = require('../../controller/admin/dashboard.controller')
// Services
const {
    format,
    addDays,
    subDays,
    parseISO,
    startOfMonth,
    endOfMonth,
} = require('date-fns')

router.group('/', (router) => {
    router.get('/', dashboardController.basicDashboard)
    // router.get('/ga', dashboardController.analyticsDashboard)
    // router.get('/ecommerce', dashboardController.ecommerceDashboard)
})

module.exports = router
