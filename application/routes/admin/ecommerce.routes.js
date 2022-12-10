const express = require('express')
require('express-group-routes')
const router = express.Router()
const orderController = require('../../controller/admin/order.controller')
const catalogController = require('../../controller/admin/catalog.controller')
const customerController = require('../../controller/admin/customer.controller')
const couponController = require('../../controller/admin/coupons.controller')

const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

router.group('/orders', (router) => {
    router.get('/', orderController.orderListing)
    router.get('/ajax', orderController.orders)
    router.get('/detail/:id', orderController.orderDetail)
})

router.group('/catalog', (router) => {
    router.group('/categories', (router) => {
        router.get('/', catalogController.categories)
        router.get('/add', catalogController.categoryAdd)
        router.get('/detail/:id', catalogController.categoryDetail)
        router.get('/edit/:id', catalogController.categoryEdit)
        router.post('/save', upload.any(), catalogController.categorySave)
        router.post('/delete-image', catalogController.deleteCategoryImage)
    })

    router.group('/products', (router) => {
        router.get('/', catalogController.products)
        router.get('/add', catalogController.productAdd)
        router.get('/detail/:id', catalogController.productDetail)
        router.get('/edit/:id', catalogController.productEdit)
        router.post('/save', upload.any(), catalogController.productSave)
    })

    router.post('/delete', catalogController.deleteItem)
    router.post('/change-status', catalogController.changeStatus)
})

router.group('/customers', (router) => {
    router.get('/', customerController.list)
    router.get('/ajax', customerController.customers)
    router.get('/:id', customerController.detail)
    router.get('/:id/activate', customerController.activateUser)
})

router.group('/coupons', (router) => {
    router.get('/', couponController.list)
    router.get('/add', couponController.add)
    router.get('/edit/:id', couponController.edit)
    router.post('/save', couponController.couponSave)
    router.post('/delete', couponController.deleteItem)
    router.post('/change-status', couponController.changeStatus)
    router.get('/download/:id', couponController.exportToExcel)
})

module.exports = router
