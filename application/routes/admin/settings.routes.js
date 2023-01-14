const express = require('express')
require('express-group-routes')
const router = express.Router()
const settingsController = require('../../controller/admin/settings.controller')

const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

router.group('/', (router) => {
    // Switch brand
    router.get('/switch-brand', settingsController.switchBrand)
    router.post('/save-fbcm-token', settingsController.saveAdminFBWebToken)
    // General
    router.group('/general', (router) => {
        router.get('/', settingsController.generalList)
        router.post('/clear-cache', settingsController.clearCache)
        router.post(
            '/brand/change-status',
            settingsController.changeBrandStatus
        )
        router.get('/brand/change-logo/:id', settingsController.editLogo)
        router.post(
            '/brand/change-logo',
            upload.any(),
            settingsController.changeLogo
        )
    })
    // SEO
    router.group('/seo', (router) => {
        router.get('/', settingsController.seoList)
        router.get('/edit', settingsController.seoEdit)
        router.post('/save', upload.any(), settingsController.seoSave)
    })
    router.group('/integrations', (router) => {
        // Marketing
        router.group('/marketing', (router) => {
            router.get('/', settingsController.marketingList)
            router.get('/edit', settingsController.marketingEdit)
            router.post('/save', upload.any(), settingsController.marketingSave)
        })
    })
    // Ecommerce
    router.group('/ecommerce', (router) => {
        router.get('/', settingsController.ecommerceList)

        // Invoice
        router.group('/invoice', (router) => {
            router.get('/edit', settingsController.invoiceEdit)
            router.post('/save', settingsController.invoiceSave)
        })
    })
    // Notification
    router.group('/notification', (router) => {
        router.get('/', settingsController.notificationList)
        router.get('/edit/:type', settingsController.editNotificationSettings)
        router.post('/save', settingsController.saveNoticationSettings)
    })
})
// router.post('/', userController.verifyOtp)

module.exports = router
