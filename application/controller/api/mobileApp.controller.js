require('dotenv').config()
const _ = require('lodash')
const { getCache, setCache } = require('../../helper/Redis.helper')
// const Content = require('../../node_modules/@ioticsme/cms/model/Content')
const BannerResource = require('../../resources/api/banner.resource')
const ContentPathResource = require('../../resources/api/contentPath.resource')
const { default: collect } = require('collect.js')
// const Banner = require('../../node_modules/@ioticsme/cms/model/Banner')
const AppBannerResource = require('../../resources/api/appBanner.resource')

const mobileBanner = async (req, res) => {
    try {
        const cache_key = `data-content-${req.brand.code}-${
            req.brand.country_code
        }-mobile-banner-${req.params.slug || 'home'}`
        const contents = await getCache(cache_key)
            .then(async (data) => {
                if (process.env.CACHE_LOCAL_DATA == 'true' && data) {
                    return JSON.parse(data)
                } else {
                    let queryOptions = {
                        brand: req.brand._id,
                        country: req.country._id,
                        banner_type: 'app',
                        published: true,
                        deletedAt: null,
                    }
                    if (req.params.slug) {
                        queryOptions.slug = req.params.slug
                    } else {
                        queryOptions.in_home = true
                    }
                    const liveData = await Banner.findOne(queryOptions)

                    const liveDataCollection = new BannerResource(
                        liveData
                    ).exec()

                    if (
                        process.env.CACHE_LOCAL_DATA == 'true' &&
                        liveDataCollection
                    ) {
                        setCache(
                            cache_key,
                            JSON.stringify(liveDataCollection),
                            60 * 60 * 24 * 30
                        )
                    }
                    return liveDataCollection
                }
            })
            .catch((err) => {
                console.log(err)
                // TODO:: Send slack notification for redis connection fail on authentication
            })
        // res.status(200).json(contents)
        res.status(200).json(new AppBannerResource(contents).exec())
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: `Something went wrong` })
    }
}

module.exports = {
    mobileBanner,
}
