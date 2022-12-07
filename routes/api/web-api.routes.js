const express = require('express')
const router = express.Router()
require('express-group-routes')
const authController = require('../../controller/api/auth.controller')
const testController = require('../../controller/api/test.controller')
const generalController = require('../../controller/api/general.controller')
// const pageController = require('../../controller/api/page.controller')
// const contentTypeController = require('../../controller/api/contentType.controller')
const catalogController = require('../../controller/api/catalog.controller')
const formController = require('../../controller/api/form.controller')
const customFormController = require('../../controller/api/customForm.controller')
const cartController = require('../../controller/api/cart.controller')
const checkoutController = require('../../controller/api/checkout.controller')
const userController = require('../../controller/api/user.controller')

// Middleware
const {
    BrandWithCountryCheck,
    webDefaultHeader,
    UserAuthCheck,
    ecommerceModeCheck,
} = require('../../middleware/api.middleware')
const getNav = require('../../middleware/nav.middleware')
const { app } = require('firebase-admin')

router.use(BrandWithCountryCheck)
router.use(webDefaultHeader)
router.use(getNav)

router.group('/', (router) => {
    router.get('/', (req, res) => {
        res.redirect('/health')
    })

    router.group('/test', (router) => {
        // router.get('/brand', testController.brandList)
        // router.get('/country', testController.countryList)
        router.get('/test', testController.test)
        router.get('/pdf', testController.pdfGenerate)
    })

    // Content
    // router.group('/cms', (router) => {
    //     router.get('/home', pageController.homePage)
    //     router.get('/:contentType', contentTypeController.list)
    //     router.get(
    //         '/:contentType/static-path',
    //         contentTypeController.generateStaticPath
    //     ) // Mainly using for NextJs Static file generations
    //     router.get('/:contentType/:slug', contentTypeController.detail)
    // })
    if (globalModuleConfig.has_cms) {
        const cmsPackageAPIRoutes = require('../../node_modules/@ioticsme/cms/routes/api.routes')
        router.use('/cms', cmsPackageAPIRoutes)
    }

    // catalog
    router.group('/catalog', (router) => {
        // Product
        router.get('/products', catalogController.productList)
        router.get('/products/:id', catalogController.productDetail)
    })

    // General
    router.group('/general', (router) => {
        router.get('/menu', generalController.menuList)
        router.get('/brand', generalController.brandingDetail)
        router.get('/navigation', generalController.navList)
    })

    // Auth
    router.group('/auth', (router) => {
        router.post('/login', authController.loginSubmit)
        router.post('/signup', authController.signupSubmit)
        router.post('/verify', authController.otpVerification)
        router.post('/resend-otp', authController.resendOTP)

        // Forgot password
        router.group('/forgot', (router) => {
            router.post('/', authController.forgotCredentials)
            router.post('/verify', authController.verifyForgotOTP)
        })
    })
    // custom forms
    router.post('/custom-forms/submit', customFormController.customFormSubmit)

    router.post('/contact/submit', formController.contactFormSubmit)
    router.post('/birthday/submit', formController.birthdayFormSubmit)
    router.group('/payfort-webhook', (router) => {
        router.all('/feedback', checkoutController.payfortWebHookFeedback)
        router.all(
            '/notification',
            checkoutController.payfortWebHookNotification
        )
    })
})

router.use(UserAuthCheck)
// user
router.group('/user', (router) => {
    router.get('/logout', authController.logout)
    router.group('/orders', (router) => {
        router.get('/', userController.orderHistory)
        router.get('/:id', userController.orderDetail)
    })
    // Account
    router.group('/account', (router) => {
        router.get('/', userController.detail)
        router.post('/edit', userController.editUser)
        router.post('/change-password', userController.changePassword)
    })
    // Middleware to check whether the application on maitenance or not
    router.use(ecommerceModeCheck)
    // cart
    router.group('/cart', (router) => {
        router.get('/', cartController.list)
        router.post('/add', cartController.add)
        router.post('/update', cartController.updateQty)
        router.post('/delete', cartController.remove)
    })

    router.group('/checkout', (router) => {
        router.post('/', checkoutController.checkoutProcess)
        router.post('/apply-coupon', checkoutController.applyCoupon)
        router.post('/payment-auth', checkoutController.paymentAuth)
        router.post('/payment', checkoutController.paymentProcess) //THIS ROUTE IS NOT INCLUDED IN AUTH PROTECTION. SEE api.middleware.js
        router.post('/order-push', checkoutController.orderFinish)
        // router.post('/add', cartController.add)
        // router.post('/delete', cartController.remove)
    })

    router.group('/card', (router) => {
        router.get('/list', userController.listCard)
        router.post('/add', userController.addCard)
        router.post('/remove', userController.unlinkCard)
    })

    router.group('/pam', (router) => {
        router.get('/parent', userController.pamGetParent)
        // router.get('/renewable-memberships/:id', userController.pamGetParent)
    })

    router.group('/payment-cards', (router) => {
        router.get('/', userController.listPaymentCard)
        router.post('/', userController.deletePaymentCards)
    })
})

module.exports = router
