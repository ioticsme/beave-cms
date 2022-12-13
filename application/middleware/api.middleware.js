require('dotenv').config()
const jwt = require('jsonwebtoken')
const collect = require('collect.js')
const { getCache, setCache } = require('../helper/Redis.helper')
const Brand = require('../model/Brand')
const Country = require('../model/Country')
const Settings = require('../model/Settings')
const User = require('../model/User')
const Menu = require('../model/Menu')

const BrandWithCountryCheck = async (req, res, next) => {
    // req.headers.brand = 'FC'
    // req.headers.locale = 'en-ae'
    try {
        if (!req.headers.brand || !req.headers.locale) {
            return res.status(400).json({ error: 'Invalid Header' })
        }

        const apiSourceList = ['app', 'web']
        const apiSource = apiSourceList.includes(req.headers?.source)
            ? req.headers?.source
            : 'web'

        // Splitting code and lang from req.headers.locale
        const lang = req.headers.locale.split('-')[0].toLowerCase()
        const countryCode = req.headers.locale.split('-')[1].toLowerCase()

        const country = await Country.findOne({ code: countryCode })
        const brand = await Brand.aggregate([
            {
                $match: {
                    code: req.headers.brand.toLowerCase(),
                },
            },
            {
                $unwind: '$domains',
            },
            {
                $match: {
                    'domains.country': country._id,
                },
            },
        ])

        if (!brand?.length) {
            return res.status(400).json({ error: 'Invalid Brand' })
        }
        if (brand[0]?.domains?.maintenance_mode) {
            return res
                .status(503)
                .json({ error: 'Application on Maintenance Mode' })
        }
        const brandSettings = await Settings.findOne({
            brand: brand[0]?._id,
            country: country._id,
        }).select('-brand -country -__v -created_at -updated_at -author')

        req.brand = {
            ...brand[0],
            settings: brandSettings,
            country_name: country.name.en,
            country_code: country.code,
            currency: country.currency,
            currency_symbol: country.currency_symbol,
            currency_decimal_points: country.currency_decimal_points,
        }
        req.country = country
        req.language = lang
        req.source = apiSource
    } catch (err) {
        return res.status(400).json({ error: 'Invalid Header' })
    }

    next()
}

const webDefaultHeader = async (req, res, next) => {
    req.source = 'web'
    next()
}

const mobileDefaultHeader = async (req, res, next) => {
    req.source = 'app'
    next()
}

const UserAuthCheck = async (req, res, next) => {
    // console.log(req.path)
    const path_to_skip = ['/user/checkout/payment']
    if (path_to_skip.includes(req.path)) {
        next()
    } else {
        try {
            if (!req.headers.authorization) {
                return res.status(401).json({
                    error: 'Unauthorized',
                })
            }
            const token = req.headers.authorization.split(' ')
            const decodedUser = jwt.verify(token[1], process.env.APP_KEY)
            // const user = await User.findOne({
            //     _id: decodedUser.data?.user?._id,
            // })
            // if (!user) {
            //     return res.status(401).json('Unauthorized')
            // }

            const tokenExistInRedis = await getCache(
                `user-${req.source}-auth-${decodedUser.data?.user?._id}`
            )
            if (!tokenExistInRedis || tokenExistInRedis != token[1]) {
                return res.status(401).json({
                    error: 'Unauthorized',
                })
            }
            // find user
            const cache_key = `semnox-brand-${req.brand.name.en}-${req.country.name.en}`

            const brandSettings = await getCache(cache_key)
                .then(async (data) => {
                    if (data) {
                        // console.log(JSON.parse(data))
                        return {
                            data: JSON.parse(data),
                            is_redis: true,
                        }
                    } else {
                        const liveData = await Settings.findOne({
                            brand: req.brand._id,
                            country: req.country._id,
                        }).select(
                            '-brand -country -__v -created_at -updated_at -author'
                        )
                        if (liveData?.length) {
                            setCache(
                                cache_key,
                                JSON.stringify(liveData),
                                parseInt(3600)
                            )
                        }

                        return {
                            data: liveData,
                            is_redis: false,
                        }
                    }
                })
                .catch((err) => {
                    // console.log(err)
                    // TODO:: Send slack notification for redis connection fail on product pull
                })
            req.authPublicUser = {
                ...decodedUser.data?.user,
                selected_brand: {
                    ...req.brand,
                    country_name: req.country.name.en,
                    country_code: req.country.code,
                    currency: req.country.currency,
                    currency_symbol: req.country.currency_symbol,
                    currency_decimal_points:
                        req.country.currency_decimal_points,
                    settings: brandSettings.data,
                },
            }
        } catch (err) {
            return res.status(401).json({
                error: 'Unauthorized',
            })
        }
        next()
    }
}

const ecommerceModeCheck = async (req, res, next) => {
    if (req.brand?.domains?.ecommerce_maintenance_mode) {
        return res
            .status(503)
            .json({ error: 'Application on Ecommerce Maintenance Mode' })
    }
    next()
}

const getNav = async (req, res, next) => {
    try {
        const cache_key = `app-nav-${req.brand?.name?.en}-${req.country?.name?.en}`

        const navigation = await getCache(cache_key)
            .then(async (data) => {
                if (data) {
                    return {
                        data: JSON.parse(data),
                        is_redis: true,
                    }
                } else {
                    const nav = await Menu.find({
                        brand: req.brand,
                        country: req.country,
                        'nav_items.active': true,
                    }).select('-country -brand -created_at -updated_at -__v')

                    let liveData = []
                    if (nav) {
                        const navCollection = collect(nav)
                        const groupedNav = navCollection.groupBy('nav_position')
                        groupedNav.all()
                        // const liveData = groupedNav.items
                        liveData =
                            groupedNav
                                .map((navItem, positionKey) => {
                                    // console.log(positionKey)
                                    // console.log(navItem.items[0].nav_items)
                                    return navItem?.items[0]?.nav_items
                                })
                                .all() || []

                        if (
                            process.env.CACHE_LOCAL_DATA == 'true' &&
                            liveData?.length
                        ) {
                            setCache(
                                cache_key,
                                JSON.stringify(liveData),
                                parseInt(3600)
                            )
                        }
                    }
                    return {
                        data: liveData,
                        is_redis: false,
                    }
                }
            })
            .catch((err) => {
                console.log(err)
                // TODO:: Send slack notification for redis connection fail on product pull
            })
        // Adding global meta to navigation
        const globalMeta = req.brand?.domains?.meta || {}
        // Restructuring the global meta
        const newGlobalMeta = {
            en: {
                title: globalMeta.title?.en,
                description: globalMeta.description?.en,
                keywords: globalMeta.keywords?.en,
                og_image: globalMeta.og_image?.en,
            },
            ar: {
                title: globalMeta.title?.ar,
                description: globalMeta.description?.ar,
                keywords: globalMeta.keywords?.ar,
                og_image: globalMeta.og_image?.ar,
            },
        }
        req.navigation = { ...navigation.data, meta: newGlobalMeta }
    } catch (error) {
        console.log(error)
        return res.status(400).json('Not found')
    }
    next()
}

module.exports = {
    BrandWithCountryCheck,
    webDefaultHeader,
    mobileDefaultHeader,
    UserAuthCheck,
    ecommerceModeCheck,
    getNav,
}
