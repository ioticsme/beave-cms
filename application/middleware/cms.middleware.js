require('dotenv').config()
const Brand = require('../model/Brand')
const Settings = require('../model/Settings')
const ContentType = require('../model/ContentType')
var session = require('express-session')

const baseConfig = async (req, res, next) => {
    res.locals.baseURL = `${process.env.DOMAIN}`
    res.locals.clientName = `${process.env.CLIENT_NAME}`
    res.locals.cmsLogoLarge = `${process.env.CMS_LOGO_LARGE}`
    res.locals.cmsLogoSmall = `${process.env.CMS_LOGO_SMALL}`
    res.locals.globalModuleConfig = globalModuleConfig 
    next()
}

const authCheck = async (req, res, next) => {
    if (!req.session || !req.session.admin_id) {
        res.redirect('/admin/auth/login')
        return
    }

    req.authUser = req.session
    next()
}

const contentTypeCheck = async (req, res, next) => {
    if (!req.params.contentType) {
        res.json('Not Found')
        return
    }
    try {
        const contentType = await ContentType.findOne({
            slug: req.params.contentType,
        })
        req.contentType = contentType
    } catch (err) {
        res.json('Not Found')
        return
    }

    next()
}

const authUser = async (req, res, next) => {
    if (!req.session.selected_brand) {
        const brand = await Brand.findOne()
            .populate({
                path: 'languages',
                options: { sort: { is_default: -1 } },
            })
            .populate('domains.country')
        if (brand) {
            const settings = await Settings.findOne({
                brand: brand,
                country: brand.domains[0].country._id,
            }).select('-brand -country -__v -created_at -updated_at -author')

            req.session.selected_brand = {
                _id: brand._id,
                name: brand.name,
                code: brand.code,
                languages: brand.languages,
                country: brand.domains[0].country._id,
                country_name: brand.domains[0].country.name.en,
                country_code: brand.domains[0].country.code,
                country_currency: brand.domains[0].country.currency,
                country_currency_symbol:
                    brand.domains[0].country.currency_symbol,
                settings: settings ? settings : {},
            }
        }
    }
    res.locals.authUser = req.session
    // console.log(req.session)
    next()
}

const mainNavGenerator = async (req, res, next) => {
    if (globalModuleConfig.has_cms) {
        const ContentType = require('../model/ContentType')
        const contentTypes = await ContentType.find({ in_use: true }).sort([
            ['position', 'ascending'],
        ])
        // app.locals.mainNav = contentTypes
        res.locals.mainNav = contentTypes
        res.locals.activeNav = req.originalUrl
        // console.log(req.originalUrl)
    } else {
        // app.locals.mainNav = contentTypes
        res.locals.mainNav = []
        res.locals.activeNav = req.originalUrl
        // console.log(req.originalUrl)
    }
    next()
}

const allBrands = async (req, res, next) => {
    const allBrands = await Brand.find()
        .populate('languages')
        .populate('domains.country')
    res.locals.allBrands = allBrands
    // console.log(allBrands[0].domains[0].country.name.en)
    next()
}

module.exports = {
    baseConfig,
    authCheck,
    contentTypeCheck,
    authUser,
    mainNavGenerator,
    allBrands,
}
