require('dotenv').config()
const express = require('express')
const fs = require('fs')
const router = express.Router()
require('express-group-routes')

// BEGIN:: Route Groups
const configRoutes = require('./config.routes')
const authRoutes = require('./auth.routes')
const dashboardRoutes = require('./dashboard.routes')
const ecommerceRoutes = require('./ecommerce.routes')
const cmsRoutes = require('./cms.routes')
const settingsRoutes = require('./settings.routes')
const formsRoutes = require('./form.routes')
const customFormsRoutes = require('./customForm.routes')
const logRoutes = require('./log.routes')
const userRoutes = require('./user.routes')
// END:: Route Groups

const checkSuperAdmin = (req, res, next) => {
    if(req.authUser.admin_role != 'super_admin') {
        return res.render(`admin/error-500`)
    }
    next()
}

// BEGIN::Admin Auth Check Middleware
const authCheck = require('../../middleware/auth.middleware')
// END::Admin Auth Check Middleware

// BEGIN:: Routes
router.use('/auth', authRoutes)
// router.use(authCheck) //Admin Auth Check middleware
router.use(authCheck)
router.get('/', (req, res) => {
    res.redirect('/admin/dashboard')
})
router.use('/dashboard', dashboardRoutes)

if (globalModuleConfig.has_ecommerce) {
    router.use('/ecommerce', ecommerceRoutes)
}
// router.use('/cms', cmsRoutes)
if (globalModuleConfig.has_cms) {
    // const cmsPackageRoutes = require('../../node_modules/@ioticsme/cms/routes/admin.routes')
    router.use('/cms', cmsRoutes)
}
router.use('/settings', settingsRoutes)
// router.use('/forms', formsRoutes)
router.use('/custom-forms', customFormsRoutes)
router.use('/log', logRoutes)
router.use('/user', userRoutes)
router.use('/config', checkSuperAdmin ,configRoutes)
// END:: Routes

module.exports = router
