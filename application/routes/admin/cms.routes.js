const express = require('express')
require('express-group-routes')
const router = express.Router()
const cmsContentController = require('../../controller/admin/cmsContent.controller')
const customFormController = require('../../controller/admin/customForm.controller')
const menuController = require('../../controller/admin/menu.controller')
const mediaController = require('../../controller/admin/media.controller')
const bannerController = require('../../controller/admin/banner.controller')
const galleryController = require('../../controller/admin/gallery.controller')
const { contentTypeCheck } = require('../../middleware/cms.middleware')

const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

router.group('/', (router) => {
    // Menu management Routes
    router.group('/media', (router) => {
        router.get('/', mediaController.list)
    })

    // Media management Routes
    router.group('/menu', (router) => {
        router.get('/', menuController.listMenu)
        router.post('/add', menuController.addMenu)
        router.get('/:position/edit/:id/:level', menuController.editMenu)
        router.post('/:position/edit', menuController.saveEditMenu)
        router.post('/delete', menuController.deleteMenu)
        router.post('/save', menuController.saveMenu)
    })

    // Banner management Routes
    router.group('/banner', (router) => {
        router.get('/', bannerController.list)
        router.get('/add', bannerController.add)
        router.get('/edit/:id', bannerController.edit)
        router.get('/detail/:id', bannerController.detail)

        router.post('/delete', bannerController.deleteBanner)

        router.post('/save', bannerController.save)

        router.post('/change-status', bannerController.changeStatus)

        router.group('/items', (router) => {
            router.get('/add/:id', bannerController.addItems)
            router.post(
                '/add/:id/save',
                upload.any(),
                bannerController.saveItems
            )
            router.get('/edit/:id/:itemId', bannerController.editItems)
            router.post(
                '/edit/save',
                upload.any(),
                bannerController.saveEditItems
            )
            router.post('/delete', bannerController.deleteBannerItem)
        })
    })

    // Gallery management Routes
    router.group('/gallery', (router) => {
        router.get('/', galleryController.list)
        router.get('/add', galleryController.add)
        router.get('/edit/:id', galleryController.edit)
        router.get('/detail/:id', galleryController.detail)

        router.post('/delete', galleryController.deleteGallery)

        router.post('/save', galleryController.save)

        router.post('/change-status', galleryController.changeStatus)

        router.group('/items', (router) => {
            router.get('/add/:id', galleryController.addItems)
            router.post(
                '/add/:id/save',
                upload.any(),
                galleryController.saveItems
            )
            router.get('/edit/:id/:itemId', galleryController.editItems)
            router.post(
                '/edit/save',
                upload.any(),
                galleryController.saveEditItems
            )
            router.post('/delete', galleryController.deleteGalleryItem)
        })
    })

    // Custom Forms
    // router.group('/store', (router) => {
    //     router.get('/', storeController.list)
    //     router.get('/add', storeController.add)
    //     router.get('/edit/:id', storeController.edit)
    //     router.post('/change-status', storeController.changeStatus)
    //     router.post('/delete', storeController.deleteItem)
    //     router.post('/save', storeController.save)
    // })

    // Custom Forms
    router.group('/forms', (router) => {
        router.get('/', customFormController.list)
        router.get('/add', customFormController.add)
        router.post('/save', customFormController.save)
    })

    // Content Management Routes
    router.get('/:contentType', contentTypeCheck, cmsContentController.list)
    router.get(
        '/:contentType/detail/:id',
        contentTypeCheck,
        cmsContentController.detail
    )
    router.get(
        '/:contentType/edit/:id',
        contentTypeCheck,
        cmsContentController.edit
    )
    router.get('/:contentType/add', contentTypeCheck, cmsContentController.add)
    router.post(
        '/:contentType/save',
        contentTypeCheck,
        upload.any(),
        cmsContentController.save
    )
    router.post(
        '/:contentType/delete',
        contentTypeCheck,
        cmsContentController.deleteContent
    )
    router.post(
        '/:contentType/change-status',
        contentTypeCheck,
        cmsContentController.changeStatus
    )
})

module.exports = router
