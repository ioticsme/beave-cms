// TODO:: Delete this file
require('dotenv').config()
const { mongoose, Types } = require('mongoose')
const fs = require('fs')
const bcrypt = require('bcrypt')
const slugify = require('slugify')
const Redis = require('./helper/Redis.helper')

const ContentType = require('./model/ContentType')
const Country = require('./model/Country')
const Language = require('./model/Language')
const Content = require('./model/Content')
const Admin = require('./model/Admin')
const User = require('./model/User')
const UserCard = require('./model/UserCard')
const Brand = require('./model/Brand')
const Banner = require('./model/Banner')
const Menu = require('./model/Menu')
const Media = require('./model/Media')
const Category = require('./model/Category')
const Product = require('./model/Product')
const Coupon = require('./model/Coupon')
const Settings = require('./model/Settings')
const Store = require('./model/Store')
const Cart = require('./model/Cart')
const collect = require('collect.js')
const Order = require('./model/Order')
const Config = require('./model/Config')
const Gallery = require('./model/Gallery')
const FormData = require('./model/FormData')

const runSeeder = async () => {
    // DB Connection
    await mongoose
        .connect(process.env.DB_CONNECTION, {
            dbName: `${process.env.DB_NAME}`,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(() => {
            console.log('DB Connected')
        })
    var db = mongoose.connection
    db.on('error', console.error.bind(console, 'MongoDB connection error:'))

    // const sourceBrand = await Brand.findOne({ code: 'fc' })
    // const targetBrands = await Brand.find({ code: { $ne: 'fc' } })
    // const ae = await Country.findOne({ code: 'ae' })

    // // Banner
    // try {
    //     const ae_fc_banners = await Banner.find({
    //         country: ae._id,
    //         brand: sourceBrand._id,
    //     })

    //     let dataToInsert = []
    //     ae_fc_banners.forEach(async (eachBanner) => {
    //         targetBrands.forEach(async (brand) => {
    //             brand.domains.forEach(async (domain) => {
    //                 const obj = {
    //                     slug: eachBanner.slug,
    //                     title: eachBanner.title,
    //                     in_home: eachBanner.in_home,
    //                     published: eachBanner.published,
    //                     brand: brand,
    //                     country: domain.country,
    //                 }

    //                 const banner_items = []
    //                 eachBanner.banner_items.forEach((bi) => {
    //                     banner_items.push({
    //                         title: bi.title,
    //                         description: bi.description,
    //                         btn_text: bi.btn_text,
    //                         position: bi.position,
    //                         btn_url: bi.btn_url,
    //                         image: bi.image,
    //                     })
    //                 })

    //                 obj.banner_items = banner_items

    //                 dataToInsert.push(obj)
    //             })
    //         })
    //     })

    //     await Banner.create(...dataToInsert).then(() => {
    //         console.log('✅ Banner Cloned')
    //     })
    // } catch (error) {
    //     console.log(`❗️ Banner Clone Error | ${error}`)
    // }

    // Settings
    try {
        const allSettings = await Settings.find()

        for (i = 0; i < allSettings.length; i++) {
            let element = allSettings[i]
            await Settings.findOneAndUpdate(
                {
                    _id: element._id,
                },
                {
                    semnox_free_toy_available:
                        element.ecommerce_settings.free_toy_available,
                    semnox_free_toy_threshold:
                        element.ecommerce_settings.free_toy_threshold,
                }
            )
        }
        console.log('✅ Settings Cloned')
    } catch (error) {
        console.log(`❗️ Settings Clone Error | ${error}`)
    }

    await Redis.clearCacheAll()

    process.exit()
}

if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'staging'
) {
    runSeeder()
} else {
    console.log(`❗️ Seeder will not run on staging or Prodution enviornment`)
}
