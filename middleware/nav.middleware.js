const collect = require('collect.js')
const { getCache, setCache } = require('../helper/Redis.helper')
// const Menu = require('../node_modules/@ioticsme/cms/model/Menu')

const getNav = async (req, res, next) => {
    if (globalModuleConfig.has_cms) {
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
                        }).select(
                            '-country -brand -created_at -updated_at -__v'
                        )

                        const navCollection = collect(nav)
                        const groupedNav = navCollection.groupBy('nav_position')
                        groupedNav.all()
                        // const liveData = groupedNav.items
                        const liveData =
                            groupedNav
                                .map((navItem, positionKey) => {
                                    // console.log(positionKey)
                                    // console.log(navItem.items[0].nav_items)
                                    return navItem?.items[0]?.nav_items
                                })
                                .all() || []

                        if (process.env.CACHE_LOCAL_DATA == 'true') {
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
            // Adding global meta to navigation
            const globalMeta = req.brand?.domains?.meta
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
            req.navigation = { ...navigation?.data, meta: newGlobalMeta }
        } catch (error) {
            console.log(error)
            return res.status(400).json('Not found')
        }
    }

    next()
}

module.exports = getNav
