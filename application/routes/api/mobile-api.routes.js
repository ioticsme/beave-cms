const express = require('express')
const router = express.Router()
require('express-group-routes')
const authController = require('../../controller/api/auth.controller')
const testController = require('../../controller/api/test.controller')
const generalController = require('../../controller/api/general.controller')
// const contentTypeController = require('../../controller/api/contentType.controller')
const catalogController = require('../../controller/api/catalog.controller')
const formController = require('../../controller/api/form.controller')
const cartController = require('../../controller/api/cart.controller')
const checkoutController = require('../../controller/api/checkout.controller')
const userController = require('../../controller/api/user.controller')
const MobileAppController = require('../../controller/api/mobileApp.controller')

// Middleware
const {
    BrandWithCountryCheck,
    mobileDefaultHeader,
    UserAuthCheck,
    ecommerceModeCheck,
    userAgent,
} = require('../../middleware/api.middleware')

router.use(BrandWithCountryCheck)
router.use(mobileDefaultHeader)
router.use(userAgent)

router.group('/v1', (router) => {
    // Auth
    router.group('/auth', (router) => {
        router.group('/login', (router) => {
            router.post('/', authController.loginSubmit)
            router.post('/social', authController.socialLoginSubmit)
            router.post('/update-mobile', authController.updateMobileNo)
        })
        router.post('/signup', authController.signupSubmit)
        router.post('/verify', authController.otpVerification)
        router.post('/resend-otp', authController.resendOTP)

        // Forgot password
        router.group('/forgot', (router) => {
            router.post('/', authController.forgotCredentials)
            router.post('/verify', authController.verifyForgotOTP)
        })
    })

    router.use(UserAuthCheck)

    // Content
    // router.group('/cms', (router) => {
    //     router.get('/banner/:slug?', MobileAppController.mobileBanner)
    //     router.get('/:contentType', contentTypeController.list)
    //     router.get('/:contentType/:slug', contentTypeController.detail)
    // })

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

    router.post('/contact/submit', formController.contactFormSubmit)
    router.post('/birthday/submit', formController.birthdayFormSubmit)

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
            router.post('/add', userController.addCard)
            router.get('/list', userController.listCard)
            router.post('/remove', userController.unlinkCard)
        })
        router.group('/payment-cards', (router) => {
            router.get('/', userController.listPaymentCard)
            router.post('/', userController.deletePaymentCards)
        })
    })

    router.all('/:key1?/:key2?/:key3?', (req, res) => {
        res.status(404).json('Not Found')
    })
})

module.exports = router
