const express = require('express')
require('express-group-routes')
const router = express.Router()

router.get('/test-custom-route', async(req, res) => {
    res.send('This is custom test route...!')
})

module.exports = router