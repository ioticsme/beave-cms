const express = require('express')
const router = express.Router()
require('express-group-routes')
const cartController = require('../../controller/api/cart.controller')
const checkoutController = require('../../controller/api/checkout.controller')
const userController = require('../../controller/api/user.controller')

// Middleware
// user
router.group('/', (router) => {
    // Middleware to check whether the application on maitenance or not
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
        router.post('/remove-coupon', checkoutController.removeAppliedCoupon)
        router.post('/payment-auth', checkoutController.paymentAuth)
        router.post('/payment', checkoutController.paymentProcess) //THIS ROUTE IS NOT INCLUDED IN AUTH PROTECTION. SEE api.middleware.js
        router.post('/order-push', checkoutController.orderFinish)
        // router.post('/add', cartController.add)
        // router.post('/delete', cartController.remove)
    })

    router.group('/orders', (router) => {
        router.get('/', userController.orderHistory)
        router.get('/:id', userController.orderDetail)
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
