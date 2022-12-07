require('dotenv').config()
const _ = require('lodash')
const path = require('path')
const slugify = require('slugify')
const Joi = require('joi')
const Banner = require('@ioticsme/cms/model/Banner')
const Country = require('../../../model/Country')
const fs = require('fs')
const { uploadMedia } = require('../../../helper/Operations.helper')
const { default: collect } = require('collect.js')


// Render banner group list
const list = async (req, res) => {
    try {
        const banners = await Banner.find({
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        return res.render(path.join(__dirname, '../../views/admin/banner/listing'), {
            data: banners,
        })
    } catch (error) {
        console.log(error)
        return res.render(`admin/error-404`)
    }
}

module.exports = {
    list,
}
