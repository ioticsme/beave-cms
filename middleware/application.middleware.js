require('dotenv').config()
const jwt = require('jsonwebtoken')
const fs = require('fs')
const { getCache, setCache } = require('../helper/Redis.helper')
const Brand = require('../model/Brand')
const Country = require('../model/Country')
const Settings = require('../model/Settings')
const User = require('../model/User')

const availableModules = async (req, res, next) => {
    if (fs.existsSync('./node_modules/cms-installer/index.js')) {
        req.installer_mode_on = true
    }
    next()
}

module.exports = {
    availableModules
}
