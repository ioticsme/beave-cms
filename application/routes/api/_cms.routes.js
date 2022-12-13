const express = require('express')
const router = express.Router()
require('express-group-routes')
const pageController = require('../../controller/api/page.controller')
const contentTypeController = require('../../controller/api/contentType.controller')

router.get('/home', pageController.homePage)
router.get('/:contentType', contentTypeController.list)
router.get(
    '/:contentType/static-path',
    contentTypeController.generateStaticPath
) // Mainly using for NextJs Static file generations
router.get('/:contentType/:slug', contentTypeController.detail)

module.exports = router
