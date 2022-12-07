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

    await Store.collection.drop()
    await Country.collection.drop()
    await Category.collection.drop()
    await Content.collection.drop()
    await ContentType.collection.drop()
    await Coupon.collection.drop()
    await Menu.collection.drop()
    await Banner.collection.drop()
    await Gallery.collection.drop()
    await Brand.collection.drop()
    await Cart.collection.drop()
    await Product.collection.drop()
    await Settings.collection.drop()
    await User.collection.drop()
    await UserCard.collection.drop()
    await Order.collection.drop()

    // Country
    try {
        await Country.create(
            {
                name: {
                    en: 'UAE',
                    ar: 'الإمارات العربية المتحدة',
                },
                code: 'ae',
                currency: 'aed',
                currency_symbol: 'aed',
                timezone: 'Asia/Dubai',
            },
            {
                name: {
                    en: 'Oman',
                    ar: 'عمان',
                },
                code: 'om',
                currency: 'aed',
                currency_symbol: 'aed',
                timezone: 'Asia/Dubai',
            },
            {
                name: {
                    en: 'Bahrain',
                    ar: 'البحرين',
                },
                code: 'bh',
                currency: 'riyal',
                currency_symbol: 'aed',
                timezone: 'Asia/Bahrain',
            },
            {
                name: {
                    en: 'Kuwait',
                    ar: 'الكويت',
                },
                code: 'kw',
                currency: 'aed',
                currency_symbol: 'aed',
                timezone: 'Asia/Kuwait',
            },
            {
                name: {
                    en: 'KSA',
                    ar: 'المملكة العربية السعودية',
                },
                code: 'ksa',
                currency: 'sar',
                currency_symbol: 'sar',
                timezone: 'Asia/Riyadh',
            },
            {
                name: {
                    en: 'Qatar',
                    ar: 'قطر',
                },
                code: 'qa',
                currency: 'qr',
                currency_symbol: 'qr',
                timezone: 'Asia/Qatar',
            }
        ).then(() => {
            console.log('✅ Country Seeder')
        })
    } catch (error) {
        console.log(`❗️ Country Seeder Error | ${error}`)
    }

    // Language
    try {
        await Language.collection.drop()

        await Language.create(
            {
                name: 'English',
                dir: 'ltr',
                prefix: 'en',
                is_default: true,
            },
            {
                name: 'Arabic',
                dir: 'rtl',
                prefix: 'ar',
                is_default: false,
            }
        ).then(() => {
            console.log('✅ Language Seeder')
        })
    } catch (error) {
        console.log(`❗️ Language Seeder Error | ${error}`)
    }

    // Brands
    try {
        const languages = await Language.find()
        const countryUae = await Country.findOne({ code: 'ae' })
        const countryBahrain = await Country.findOne({ code: 'bh' })
        const countryOman = await Country.findOne({ code: 'om' })
        const countryQatar = await Country.findOne({ code: 'qa' })
        const countryKuwait = await Country.findOne({ code: 'kw' })

        await Brand.create(
            {
                name: { en: 'Fun Block', ar: 'فن بلوك' },
                logo: {
                    en: 'funblock-main-logo',
                    ar: 'funblock-main-logo',
                },
                code: 'fb',
                link: '#',
                languages: languages,
                domains: [
                    {
                        logo: { en: 'brand domain logo' },
                        country: countryUae,
                    },
                    {
                        logo: { en: 'brand domain logo' },
                        country: countryOman,
                    },
                ],
            },
            {
                name: {
                    en: 'Fun Works',
                    ar: 'فن وركس',
                },
                logo: {
                    en: 'funworks-main-logo',
                    ar: 'funworks-main-logo',
                },
                code: 'fw',
                link: '#',
                languages: languages,
                domains: [
                    {
                        logo: { en: 'brand domain logo' },
                        country: countryUae,
                    },
                ],
            },
            {
                name: {
                    en: 'Tridom',
                    ar: 'ترايدوم',
                },
                logo: {
                    en: 'tridom-main-logo',
                    ar: 'tridom-main-logo',
                },
                code: 'tr',
                link: '#',
                languages: languages,
                domains: [
                    {
                        logo: { en: 'brand domain logo' },
                        country: countryUae,
                    },
                ],
            },
            {
                name: {
                    en: 'Fun Ville',
                    ar: 'فن ڨيل',
                },
                logo: {
                    en: 'funvillearabia-main-logo',
                    ar: 'funvillearabia-main-logo',
                },
                code: 'fv',
                link: '#',
                languages: languages,
                domains: [
                    {
                        logo: { en: 'brand domain logo' },
                        country: countryUae,
                    },
                    {
                        logo: { en: 'brand domain logo' },
                        country: countryQatar,
                    },
                ],
            }
        ).then(() => {
            console.log('✅ Brand Seeder')
        })
    } catch (error) {
        console.log(`❗️ Brand Seeder Error | ${error}`)
    }

    // Admin users
    try {
        const saltRounds = 10
        const salt = bcrypt.genSaltSync(saltRounds)

        await Admin.collection.drop()

        await Admin.create({
            name: 'Ebrahim Nayakkan',
            email: 'ebrahim@iotics.me',
            password: bcrypt.hashSync('password', salt),
            role: 'admin',
            active: true,
        }).then(() => {
            console.log('✅ Admin Seeder')
        })
    } catch (error) {
        console.log(`❗️ Admin Seeder Error | ${error}`)
    }

    // Users
    try {
        const saltRounds = 10
        const salt = bcrypt.genSaltSync(saltRounds)
        const brand = await Brand.findOne({ code: 'fc' })
        const country = await Country.findOne({ code: 'ae' })
        await User.create(
            {
                first_name: 'Ebrahim',
                last_name: 'Nayakkan',
                email: 'ebrahim@iotics.me',
                mobile: '971566994313',
                password: bcrypt.hashSync('password', salt),
                active: true,
                domain: { brand, country },
            },
            {
                first_name: 'Nabeel',
                last_name: 'Moidootty',
                email: 'nabeel@iotics.me',
                mobile: '971559557432',
                active: true,
                password: bcrypt.hashSync('password', salt),
                domain: { brand, country },
            }
        ).then(() => {
            console.log('✅ User Seeder')
        })
    } catch (error) {
        console.log(`❗️ User Seeder Error | ${error}`)
    }

    // Banner
    try {
        const brand = await Brand.findOne({ code: 'fc' })
        const country = await Country.findOne({ code: 'ae' })

        let bannersRawData = fs.readFileSync('seeder-data/banners.json')
        let banners = await JSON.parse(bannersRawData)

        let dataToInsert = []
        banners.forEach(async (eachBanner) => {
            dataToInsert.push({
                slug: eachBanner.slug,
                title: eachBanner.title,
                in_home: eachBanner.in_home,
                published: eachBanner.published,
                banner_items: eachBanner.banner_items,
                brand: brand,
                country: country,
            })
        })

        await Banner.create(...dataToInsert).then(() => {
            console.log('✅ Banner Seeder')
        })
    } catch (error) {
        console.log(`❗️ Banner Seeder Error | ${error}`)
    }

    // Gallery
    try {
        const brand = await Brand.findOne({ code: 'fc' })
        const country = await Country.findOne({ code: 'ae' })

        let galleryRawData = fs.readFileSync('seeder-data/gallery.json')
        let gallery = await JSON.parse(galleryRawData)

        let dataToInsert = []
        gallery.forEach(async (eachgallery) => {
            dataToInsert.push({
                slug: slugify(eachgallery.title.toLowerCase()),
                title: eachgallery.title,
                description: eachgallery.description,
                in_home: eachgallery.in_home,
                published: eachgallery.published,
                gallery_items: eachgallery.gallery_items,
                brand: brand,
                country: country,
            })
        })

        await Gallery.create(...dataToInsert).then(() => {
            console.log('✅ Gallery Seeder')
        })
    } catch (error) {
        console.log(`❗️ Gallery Seeder Error | ${error}`)
    }

    // Content Type
    try {
        const typeArray = [
            {
                type: 'Page',
                show_in_admin: true,
                admin_icon: `<path d="M16 21H8C7.4 21 7 20.6 7 20V4C7 3.4 7.4 3 8 3H16C16.6 3 17 3.4 17 4V20C17 20.6 16.6 21 16 21Z" fill="currentColor"/>
                <path opacity="0.3" d="M2 3H4C4.6 3 5 3.4 5 4V20C5 20.6 4.6 21 4 21H2V3ZM20 21H22V3H20C19.4 3 19 3.4 19 4V20C19 20.6 19.4 21 20 21Z" fill="currentColor"/>`,
                // in_use: true,
                position: 1,
                has_banner: true,
                has_gallery: true,
                hide_excerpt: true,
                custom_fields: [
                    {
                        field_label: 'Featured Image',
                        field_name: 'featured_image',
                        field_type: 'file',
                        placeholder: 'Please Upload Media File',
                        addValidation: 'Joi.string().required()',
                        editValidation: 'Joi.optional()',
                        validation: [
                            //     // 'string()',
                            //     // 'required()',
                            //     // 'min(10)',
                            //     // 'max(500)',
                            `when('method', {is: Joi.string().valid('add'),then: Joi.string().required(),otherwise: Joi.any(),})`,
                        ],
                        info: [
                            'Prefered Upload File size for attraction is 1460px X 730px',
                            'Prefered Upload File size for content block is 960px X 533px',
                            'Prefered Upload File size for inner pages featured image is 700px X 344px',
                        ],
                    },
                ],
                allowed_type: [
                    'promotion',
                    'attraction',
                    'post',
                    'event',
                    'birthday-package',
                    'content-block',
                ],
            },
            {
                type: 'Post',
                show_in_admin: true,
                admin_icon: `<path opacity="0.5" d="M18 2H9C7.34315 2 6 3.34315 6 5H8C8 4.44772 8.44772 4 9 4H18C18.5523 4 19 4.44772 19 5V16C19 16.5523 18.5523 17 18 17V19C19.6569 19 21 17.6569 21 16V5C21 3.34315 19.6569 2 18 2Z" fill="currentColor"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M14.7857 7.125H6.21429C5.62255 7.125 5.14286 7.6007 5.14286 8.1875V18.8125C5.14286 19.3993 5.62255 19.875 6.21429 19.875H14.7857C15.3774 19.875 15.8571 19.3993 15.8571 18.8125V8.1875C15.8571 7.6007 15.3774 7.125 14.7857 7.125ZM6.21429 5C4.43908 5 3 6.42709 3 8.1875V18.8125C3 20.5729 4.43909 22 6.21429 22H14.7857C16.5609 22 18 20.5729 18 18.8125V8.1875C18 6.42709 16.5609 5 14.7857 5H6.21429Z" fill="currentColor"/>`,
                // in_use: true,
                position: 2,
                custom_fields: [
                    {
                        field_label: 'Featured Image',
                        field_name: 'featured_image',
                        field_type: 'file',
                        placeholder: 'Please Upload Media File',
                        addValidation: 'Joi.string().required()',
                        editValidation: 'Joi.optional()',
                        validation: [
                            // 'string()',
                            // 'required()',
                            // 'min(10)',
                            // 'max(500)',
                            `when('method', {is: Joi.string().valid('add'),then: Joi.string().required(),otherwise: Joi.optional(),})`,
                        ],
                        info: [
                            'Prefered Upload File size for attraction is 1460px X 730px',
                            'Prefered Upload File size for content block is 960px X 533px',
                            'Prefered Upload File size for inner pages featured image is 700px X 344px',
                        ],
                    },
                ],
                allowed_type: ['store', 'content-block'],
            },
            {
                type: 'FAQ',
                show_in_admin: true,
                admin_icon: `<path opacity="0.3" d="M20 3H4C2.89543 3 2 3.89543 2 5V16C2 17.1046 2.89543 18 4 18H4.5C5.05228 18 5.5 18.4477 5.5 19V21.5052C5.5 22.1441 6.21212 22.5253 6.74376 22.1708L11.4885 19.0077C12.4741 18.3506 13.6321 18 14.8167 18H20C21.1046 18 22 17.1046 22 16V5C22 3.89543 21.1046 3 20 3Z" fill="currentColor"/>
                <rect x="6" y="12" width="7" height="2" rx="1" fill="currentColor"/>
                <rect x="6" y="7" width="12" height="2" rx="1" fill="currentColor"/>`,
                position: 7,
                hide_excerpt: true,
            },
            {
                type: 'Attraction',
                admin_icon: `<path opacity="0.3" d="M18 21.6C16.3 21.6 15 20.3 15 18.6V2.50001C15 2.20001 14.6 1.99996 14.3 2.19996L13 3.59999L11.7 2.3C11.3 1.9 10.7 1.9 10.3 2.3L9 3.59999L7.70001 2.3C7.30001 1.9 6.69999 1.9 6.29999 2.3L5 3.59999L3.70001 2.3C3.50001 2.1 3 2.20001 3 3.50001V18.6C3 20.3 4.3 21.6 6 21.6H18Z" fill="currentColor"/>
                <path d="M12 12.6H11C10.4 12.6 10 12.2 10 11.6C10 11 10.4 10.6 11 10.6H12C12.6 10.6 13 11 13 11.6C13 12.2 12.6 12.6 12 12.6ZM9 11.6C9 11 8.6 10.6 8 10.6H6C5.4 10.6 5 11 5 11.6C5 12.2 5.4 12.6 6 12.6H8C8.6 12.6 9 12.2 9 11.6ZM9 7.59998C9 6.99998 8.6 6.59998 8 6.59998H6C5.4 6.59998 5 6.99998 5 7.59998C5 8.19998 5.4 8.59998 6 8.59998H8C8.6 8.59998 9 8.19998 9 7.59998ZM13 7.59998C13 6.99998 12.6 6.59998 12 6.59998H11C10.4 6.59998 10 6.99998 10 7.59998C10 8.19998 10.4 8.59998 11 8.59998H12C12.6 8.59998 13 8.19998 13 7.59998ZM13 15.6C13 15 12.6 14.6 12 14.6H10C9.4 14.6 9 15 9 15.6C9 16.2 9.4 16.6 10 16.6H12C12.6 16.6 13 16.2 13 15.6Z" fill="currentColor"/>
                <path d="M15 18.6C15 20.3 16.3 21.6 18 21.6C19.7 21.6 21 20.3 21 18.6V12.5C21 12.2 20.6 12 20.3 12.2L19 13.6L17.7 12.3C17.3 11.9 16.7 11.9 16.3 12.3L15 13.6V18.6Z" fill="currentColor"/>`,
                show_in_admin: true,
                position: 3,
                has_banner: true,
                has_gallery: true,
                custom_fields: [
                    {
                        field_label: 'Button Text',
                        field_name: 'btn_text',
                        field_type: 'text',
                        placeholder: 'Button text',
                        validation: [
                            'string()',
                            'optional()',
                            'min(3)',
                            'max(20)',
                            'allow(null, "")',
                        ],
                    },
                    {
                        field_label: 'Button URL',
                        field_name: 'btn_url',
                        field_type: 'text',
                        placeholder: 'Button URL',
                        validation: [
                            'string()',
                            'optional()',
                            'allow(null, "")',
                        ],
                    },
                    {
                        field_label: 'Featured Image',
                        field_name: 'featured_image',
                        field_type: 'file',
                        placeholder: 'Please Upload Media File',
                        addValidation: 'Joi.string().required()',
                        editValidation: 'Joi.optional()',
                        validation: [
                            // 'string()',
                            // 'required()',
                            `when('method', {is: Joi.string().valid('add'),then: Joi.string().required(),otherwise: Joi.optional(),})`,
                        ],
                        info: [
                            'Prefered Upload File size for attraction is 1460px X 730px',
                            'Prefered Upload File size for content block is 960px X 533px',
                            'Prefered Upload File size for inner pages featured image is 700px X 344px',
                        ],
                    },
                ],
                allowed_type: ['store', 'content-block'],
            },
            {
                type: 'Event',
                admin_icon: `<path opacity="0.3" d="M14 3V20H2V3C2 2.4 2.4 2 3 2H13C13.6 2 14 2.4 14 3ZM11 13V11C11 9.7 10.2 8.59995 9 8.19995V7C9 6.4 8.6 6 8 6C7.4 6 7 6.4 7 7V8.19995C5.8 8.59995 5 9.7 5 11V13C5 13.6 4.6 14 4 14V15C4 15.6 4.4 16 5 16H11C11.6 16 12 15.6 12 15V14C11.4 14 11 13.6 11 13Z" fill="currentColor"/>
                <path d="M2 20H14V21C14 21.6 13.6 22 13 22H3C2.4 22 2 21.6 2 21V20ZM9 3V2H7V3C7 3.6 7.4 4 8 4C8.6 4 9 3.6 9 3ZM6.5 16C6.5 16.8 7.2 17.5 8 17.5C8.8 17.5 9.5 16.8 9.5 16H6.5ZM21.7 12C21.7 11.4 21.3 11 20.7 11H17.6C17 11 16.6 11.4 16.6 12C16.6 12.6 17 13 17.6 13H20.7C21.2 13 21.7 12.6 21.7 12ZM17 8C16.6 8 16.2 7.80002 16.1 7.40002C15.9 6.90002 16.1 6.29998 16.6 6.09998L19.1 5C19.6 4.8 20.2 5 20.4 5.5C20.6 6 20.4 6.60005 19.9 6.80005L17.4 7.90002C17.3 8.00002 17.1 8 17 8ZM19.5 19.1C19.4 19.1 19.2 19.1 19.1 19L16.6 17.9C16.1 17.7 15.9 17.1 16.1 16.6C16.3 16.1 16.9 15.9 17.4 16.1L19.9 17.2C20.4 17.4 20.6 18 20.4 18.5C20.2 18.9 19.9 19.1 19.5 19.1Z" fill="currentColor"/>`,
                show_in_admin: false,
                position: 4,
                custom_fields: [
                    {
                        field_label: 'Start date',
                        field_name: 'start_date',
                        field_type: 'date',
                        placeholder: 'Select start date',
                        validation: [
                            // 'string()',
                            'optional()',
                            // 'min(10)',
                            // 'max(500)',
                        ],
                    },
                    {
                        field_label: 'End date',
                        field_name: 'end_date',
                        field_type: 'date',
                        placeholder: 'Select end date',
                        validation: [
                            // 'string()',
                            'optional()',
                            // 'min(10)',
                            // 'max(500)',
                        ],
                    },
                ],
                allowed_type: ['store', 'content-block'],
            },
            {
                type: 'Promotion',
                admin_icon: `<path opacity="0.3" d="M18 22H6C5.4 22 5 21.6 5 21V8C6.6 6.4 7.4 5.6 9 4H15C16.6 5.6 17.4 6.4 19 8V21C19 21.6 18.6 22 18 22ZM12 5.5C11.2 5.5 10.5 6.2 10.5 7C10.5 7.8 11.2 8.5 12 8.5C12.8 8.5 13.5 7.8 13.5 7C13.5 6.2 12.8 5.5 12 5.5Z" fill="currentColor"/>
                <path d="M12 7C11.4 7 11 6.6 11 6V3C11 2.4 11.4 2 12 2C12.6 2 13 2.4 13 3V6C13 6.6 12.6 7 12 7ZM15.1 10.6C15.1 10.5 15.1 10.4 15 10.3C14.9 10.2 14.8 10.2 14.7 10.2C14.6 10.2 14.5 10.2 14.4 10.3C14.3 10.4 14.3 10.5 14.2 10.6L9 19.1C8.9 19.2 8.89999 19.3 8.89999 19.4C8.89999 19.5 8.9 19.6 9 19.7C9.1 19.8 9.2 19.8 9.3 19.8C9.5 19.8 9.6 19.7 9.8 19.5L15 11.1C15 10.8 15.1 10.7 15.1 10.6ZM11 11.6C10.9 11.3 10.8 11.1 10.6 10.8C10.4 10.6 10.2 10.4 10 10.3C9.8 10.2 9.50001 10.1 9.10001 10.1C8.60001 10.1 8.3 10.2 8 10.4C7.7 10.6 7.49999 10.9 7.39999 11.2C7.29999 11.6 7.2 12 7.2 12.6C7.2 13.1 7.3 13.5 7.5 13.9C7.7 14.3 7.9 14.5 8.2 14.7C8.5 14.9 8.8 14.9 9.2 14.9C9.8 14.9 10.3 14.7 10.6 14.3C11 13.9 11.1 13.3 11.1 12.5C11.1 12.3 11.1 11.9 11 11.6ZM9.8 13.8C9.7 14.1 9.5 14.2 9.2 14.2C9 14.2 8.8 14.1 8.7 14C8.6 13.9 8.5 13.7 8.5 13.5C8.5 13.3 8.39999 13 8.39999 12.6C8.39999 12.2 8.4 11.9 8.5 11.7C8.5 11.5 8.6 11.3 8.7 11.2C8.8 11.1 9 11 9.2 11C9.5 11 9.7 11.1 9.8 11.4C9.9 11.7 10 12 10 12.6C10 13.2 9.9 13.6 9.8 13.8ZM16.5 16.1C16.4 15.8 16.3 15.6 16.1 15.4C15.9 15.2 15.7 15 15.5 14.9C15.3 14.8 15 14.7 14.6 14.7C13.9 14.7 13.4 14.9 13.1 15.3C12.8 15.7 12.6 16.3 12.6 17.1C12.6 17.6 12.7 18 12.9 18.4C13.1 18.7 13.3 19 13.6 19.2C13.9 19.4 14.2 19.5 14.6 19.5C15.2 19.5 15.7 19.3 16 18.9C16.4 18.5 16.5 17.9 16.5 17.1C16.7 16.8 16.6 16.4 16.5 16.1ZM15.3 18.4C15.2 18.7 15 18.8 14.7 18.8C14.4 18.8 14.2 18.7 14.1 18.4C14 18.1 13.9 17.7 13.9 17.2C13.9 16.8 13.9 16.5 14 16.3C14.1 16.1 14.1 15.9 14.2 15.8C14.3 15.7 14.5 15.6 14.7 15.6C15 15.6 15.2 15.7 15.3 16C15.4 16.2 15.5 16.6 15.5 17.2C15.5 17.7 15.4 18.1 15.3 18.4Z" fill="currentColor"/>`,
                show_in_admin: true,
                position: 5,
                has_banner: true,
                custom_fields: [
                    {
                        field_label: 'Terms & Conditions',
                        field_name: 'terms_conditions',
                        field_type: 'wysiwyg',
                        placeholder: 'Terms & Conditions',
                        bilingual: true,
                        validation: [
                            'string()',
                            'optional()',
                            'allow(null, "")',
                        ],
                    },
                    {
                        field_label: 'Available At',
                        field_name: 'available_at',
                        field_type: 'text',
                        placeholder: 'Available At',
                        bilingual: true,
                        validation: [
                            'string()',
                            'optional()',
                            'allow(null, "")',
                        ],
                    },
                    {
                        field_label: 'Start date',
                        field_name: 'start_date',
                        field_type: 'date',
                        placeholder: 'Select start date',
                        bilingual: false,
                        validation: [
                            // 'string()',
                            'optional()',
                            // 'min(10)',
                            // 'max(500)',
                        ],
                    },
                    {
                        field_label: 'End date',
                        field_name: 'end_date',
                        field_type: 'date',
                        placeholder: 'Select end date',
                        bilingual: false,
                        validation: [
                            // 'string()',
                            'optional()',
                            // 'min(10)',
                            // 'max(500)',
                        ],
                    },
                    {
                        field_label: 'Featured Image',
                        field_name: 'featured_image',
                        field_type: 'file',
                        placeholder: 'Please Upload Media File',
                        addValidation: 'Joi.string().required()',
                        editValidation: 'Joi.optional()',
                        validation: [
                            // 'string()',
                            // 'required()',
                            // 'min(10)',
                            // 'max(500)',
                            `when('method', {is: Joi.string().valid('add'),then: Joi.string().required(),otherwise: Joi.optional(),})`,
                        ],
                        info: ['Prefered Upload File size is 700px X 344px'],
                    },
                ],
                allowed_type: ['store', 'content-block'],
            },
            {
                type: 'Birthday Package',
                admin_icon: `<path d="M21 9V11C21 11.6 20.6 12 20 12H14V8H20C20.6 8 21 8.4 21 9ZM10 8H4C3.4 8 3 8.4 3 9V11C3 11.6 3.4 12 4 12H10V8Z" fill="currentColor" />
                            <path d="M15 2C13.3 2 12 3.3 12 5V8H15C16.7 8 18 6.7 18 5C18 3.3 16.7 2 15 2Z" fill="currentColor" />
                            <path opacity="0.3" d="M9 2C10.7 2 12 3.3 12 5V8H9C7.3 8 6 6.7 6 5C6 3.3 7.3 2 9 2ZM4 12V21C4 21.6 4.4 22 5 22H10V12H4ZM20 12V21C20 21.6 19.6 22 19 22H14V12H20Z" fill="currentColor" />`,
                show_in_admin: true,
                position: 5,
                has_banner: false,
                custom_fields: [
                    {
                        field_label: 'Available Items',
                        field_name: 'available_items',
                        field_type: 'wysiwyg',
                        placeholder: 'Available Items',
                        validation: ['string()', 'required()'],
                    },
                    {
                        field_label: 'Non-Available Items (Optional)',
                        field_name: 'non_available_items',
                        field_type: 'wysiwyg',
                        placeholder: 'Non-Available Items',
                        validation: [
                            'string()',
                            'optional()',
                            'allow(null, "")',
                        ],
                    },
                    {
                        field_label: 'Weekdays Price',
                        field_name: 'weekday_price',
                        field_type: 'text',
                        placeholder: 'Weekdays Price',
                        validation: ['string()', 'optional()'],
                    },
                    {
                        field_label: 'Weekend Price',
                        field_name: 'weekend_price',
                        field_type: 'text',
                        placeholder: 'Weekdays Price',
                        validation: ['string()', 'optional()'],
                    },
                    {
                        field_label: 'Featured',
                        field_name: 'featured',
                        field_type: 'radio',
                        placeholder: 'Featured',
                        bilingual: false,
                        options: [
                            { label: 'No', value: 'false' },
                            { label: 'Yes', value: 'true' },
                        ],
                        validation: ['boolean()', 'optional()'],
                    },
                ],
                allowed_type: ['store', 'content-block'],
            },
            {
                type: 'Store',
                admin_icon: `<path opacity="0.3"
                d="M18 10V20C18 20.6 18.4 21 19 21C19.6 21 20 20.6 20 20V10H18Z"
                fill="currentColor"></path>
            <path opacity="0.3"
                d="M11 10V17H6V10H4V20C4 20.6 4.4 21 5 21H12C12.6 21 13 20.6 13 20V10H11Z"
                fill="currentColor"></path>
            <path opacity="0.3"
                d="M10 10C10 11.1 9.1 12 8 12C6.9 12 6 11.1 6 10H10Z"
                fill="currentColor" ></path>
            <path opacity="0.3"
                d="M18 10C18 11.1 17.1 12 16 12C14.9 12 14 11.1 14 10H18Z"
                fill="currentColor"></path>
            <path opacity="0.3" d="M14 4H10V10H14V4Z" fill="currentColor"></path>
            <path opacity="0.3" d="M17 4H20L22 10H18L17 4Z" fill="currentColor"></path>
            <path opacity="0.3" d="M7 4H4L2 10H6L7 4Z" fill="currentColor"></path>
            <path d="M6 10C6 11.1 5.1 12 4 12C2.9 12 2 11.1 2 10H6ZM10 10C10 11.1 10.9 12 12 12C13.1 12 14 11.1 14 10H10ZM18 10C18 11.1 18.9 12 20 12C21.1 12 22 11.1 22 10H18ZM19 2H5C4.4 2 4 2.4 4 3V4H20V3C20 2.4 19.6 2 19 2ZM12 17C12 16.4 11.6 16 11 16H6C5.4 16 5 16.4 5 17C5 17.6 5.4 18 6 18H11C11.6 18 12 17.6 12 17Z"
                fill="currentColor"></path>`,
                show_in_admin: true,
                position: 6,
                has_banner: false,
                hide_excerpt: true,
                custom_fields: [
                    {
                        field_label: 'Address',
                        field_name: 'address',
                        field_type: 'textarea',
                        placeholder: 'Address',
                        validation: ['string()', 'required()'],
                    },
                    {
                        field_label: 'City',
                        field_name: 'city',
                        field_type: 'text',
                        placeholder: 'City',
                        validation: ['string()', 'required()'],
                    },
                    {
                        field_label: 'Opening Hours',
                        field_name: 'opening_hours',
                        field_type: 'wysiwyg',
                        placeholder: 'Store Opening Hours',
                        validation: ['string()', 'required()'],
                    },
                    {
                        field_label: 'Phone Number',
                        field_name: 'phone_number',
                        field_type: 'text',
                        placeholder: 'Phone Number',
                        bilingual: false,
                        validation: [
                            'string()',
                            'optional()',
                            'allow(null, "")',
                        ],
                    },
                    {
                        field_label: 'Email',
                        field_name: 'email',
                        field_type: 'text',
                        placeholder: 'Store Email',
                        bilingual: false,
                        validation: [
                            'string()',
                            'optional()',
                            'allow(null, "")',
                        ],
                    },
                    {
                        field_label: 'Latitude',
                        field_name: 'lat',
                        field_type: 'text',
                        placeholder: 'Latitude',
                        bilingual: false,
                        validation: ['string()', 'required()'],
                    },
                    {
                        field_label: 'Longitude',
                        field_name: 'lng',
                        field_type: 'text',
                        placeholder: 'Longitude',
                        bilingual: false,
                        validation: ['string()', 'required()'],
                    },
                ],
            },
            {
                type: 'Content Block',
                admin_icon: `<path d="M3 7.19995H10C10.6 7.19995 11 6.79995 11 6.19995V3.19995C11 2.59995 10.6 2.19995 10 2.19995H3C2.4 2.19995 2 2.59995 2 3.19995V6.19995C2 6.69995 2.4 7.19995 3 7.19995Z" fill="currentColor"/>
                <path opacity="0.3" d="M10.1 22H3.10001C2.50001 22 2.10001 21.6 2.10001 21V10C2.10001 9.4 2.50001 9 3.10001 9H10.1C10.7 9 11.1 9.4 11.1 9V20C11.1 21.6 10.7 22 10.1 22ZM13.1 18V21C13.1 21.6 13.5 22 14.1 22H21.1C21.7 22 22.1 21.6 22.1 21V18C22.1 17.4 21.7 17 21.1 17H14.1C13.5 17 13.1 17.4 13.1 18ZM21.1 2H14.1C13.5 2 13.1 2.4 13.1 3V14C13.1 14.6 13.5 15 14.1 15H21.1C21.7 15 22.1 14.6 22.1 14V3C22.1 2.4 21.7 2 21.1 2Z" fill="currentColor"/>`,
                show_in_admin: true,
                position: 7,
                has_api_endpoint: false,
                has_banner: false,
                has_gallery: false,
                hide_excerpt: true,
                hide_meta: true,
                custom_fields: [
                    {
                        field_label: 'Featured Image',
                        field_name: 'featured_image',
                        field_type: 'file',
                        placeholder: 'Please Upload Media File',
                        addValidation: 'Joi.string().required()',
                        editValidation: 'Joi.optional()',
                        validation: [
                            // 'string()',
                            // 'required()',
                            // 'min(10)',
                            // 'max(500)',
                            `when('method', {is: Joi.string().valid('add'),then: Joi.string().required(),otherwise: Joi.optional(),})`,
                        ],
                        info: [
                            'Prefered Upload File size for attraction is 1460px X 730px',
                            'Prefered Upload File size for content block is 960px X 533px',
                            'Prefered Upload File size for inner pages featured image is 700px X 344px',
                        ],
                    },
                    {
                        field_label: 'Button Text',
                        field_name: 'btn_text',
                        field_type: 'text',
                        placeholder: 'Button text',
                        validation: [
                            'string()',
                            'optional()',
                            'min(3)',
                            'max(20)',
                            'allow(null, "")',
                        ],
                    },
                    {
                        field_label: 'Button URL',
                        field_name: 'btn_url',
                        field_type: 'text',
                        placeholder: 'Button URL',
                        validation: [
                            'string()',
                            'optional()',
                            'allow(null, "")',
                        ],
                    },
                ],
            },
        ]

        let dataToInsert = []
        typeArray.forEach((element) => {
            dataToInsert.push({
                title: element.type,
                slug: slugify(element.type.toLowerCase()),
                admin_icon: element.admin_icon,
                position: element.position,
                template_name: element.type.toLowerCase(),
                custom_fields: element.custom_fields || [],
                allowed_type: element.allowed_type || [],
                in_use: element.in_use,
                has_banner: element?.has_banner,
                has_gallery: element?.has_banner,
                hide_title: element.hide_title || false,
                hide_body: element.hide_body || false,
                hide_excerpt: element.hide_excerpt || false,
                hide_meta: element.hide_meta || false,
            })
        })
        await ContentType.create(dataToInsert).then(() => {
            console.log('✅ Content Typer Seeder')
        })
    } catch (error) {
        console.log(`❗️ Content Typer Seeder Error | ${error}`)
    }

    // Content
    try {
        const content_types = collect(await ContentType.find())
        const countries = collect(await Country.find())
        const author = await Admin.findOne({ email: 'ebrahim@iotics.me' })
        // const country = await Country.findOne({ code: 'ae' })
        const brands = collect(await Brand.find())

        // Attaching Banner with content
        const banners = await Banner.find()
        const galleries = await Gallery.find()

        let pagesRawdata = fs.readFileSync('seeder-data/pages.json')
        let attractionsRawdata = fs.readFileSync('seeder-data/attractions.json')
        let promotionsRawdata = fs.readFileSync('seeder-data/promotions.json')
        let bpRawdata = fs.readFileSync('seeder-data/birthdaypackages.json')
        let faqRawdata = fs.readFileSync('seeder-data/faq.json')
        let contentBlockRawdata = fs.readFileSync(
            'seeder-data/content-blocks.json'
        )
        let contents = await JSON.parse(pagesRawdata)
        contents.push(...(await JSON.parse(attractionsRawdata)))
        contents.push(...(await JSON.parse(promotionsRawdata)))
        contents.push(...(await JSON.parse(bpRawdata)))
        contents.push(...(await JSON.parse(faqRawdata)))
        contents.push(...(await JSON.parse(contentBlockRawdata)))

        let datatToInsert = []
        contents.forEach((eachContent) => {
            const brand = brands.where('code', 'fc').first()
            const itemContentType = content_types
                .where('slug', eachContent.type)
                .first()
            const country = countries
                .where('name.en', eachContent.country)
                .first()
            const obj = {
                slug: eachContent.slug,
                type_id: itemContentType._id,
                type_slug: eachContent.type,
                author: author,
                brand: brand,
                country: country._id,
                published: true,
                in_home: eachContent.in_home ? true : false,
                template_name: 'page',
                content: eachContent.content,
                meta: eachContent.meta || {},
            }

            const selectedContentType = collect(content_types)
                .where('slug', eachContent.type)
                .first()

            if (eachContent.banner && selectedContentType?.has_banner) {
                contentBanner = collect(banners)
                    .where('slug', eachContent.banner)
                    .first()
                if (contentBanner) {
                    obj.banner = contentBanner._id
                }
            }

            if (eachContent.gallery && selectedContentType?.has_banner) {
                contentGallery = collect(galleries)
                    .where('slug', eachContent.gallery)
                    .first()
                if (contentGallery) {
                    obj.gallery = contentGallery._id
                }
            }

            datatToInsert.push(obj)
        })

        let countryRawdata = fs.readFileSync('seeder-data/countries.json')
        let jsonCountries = collect(await JSON.parse(countryRawdata))
        let storeRawdata = fs.readFileSync('seeder-data/stores.json')
        let storeContents = collect(await JSON.parse(storeRawdata))

        storeContents.groupBy('id').map((eachGroup) => {
            // console.log(eachGroup)
            const brand = brands.where('code', eachGroup.items[0].brand).first()
            if (brand?._id) {
                const itemContentType = content_types
                    .where('slug', 'store')
                    .first()
                const countryJsonName = jsonCountries
                    .where('id', eachGroup.items[0].country_id)
                    .first()

                const country = countries
                    .where('name.en', countryJsonName.name)
                    .first()
                datatToInsert.push({
                    slug: slugify(eachGroup.items[0]?.name.toLowerCase()),
                    type_id: itemContentType._id,
                    type_slug: 'store',
                    author: author,
                    brand: brand,
                    country: country._id,
                    published: true,
                    template_name: 'store',
                    content: {
                        en: {
                            title: eachGroup.items[0]?.name,
                            // body_content: eachGroup.items[0].name,
                            opening_hours: 'SUN-SAT 08:00 AM - 11:00 PM',
                            city: eachGroup.items[0]?.city || 'Dubai',
                            address: eachGroup.items[0]?.address,
                        },
                        ar: {
                            title: eachGroup.items[1]?.name,
                            // body_content: eachGroup.items[0].name,
                            opening_hours: 'SUN-SAT 08:00 AM - 11:00 PM',
                            city: eachGroup.items[1]?.city || 'Dubai',
                            address: eachGroup.items[1]?.address,
                        },
                        common: {
                            phone_number: eachGroup.items[0]?.phone,
                            email: eachGroup.items[0]?.email,
                            lat: eachGroup.items[0]?.lat_long.split(',')[0],
                            lng: eachGroup.items[0]?.lat_long.split(',')[1],
                        },
                    },
                })
            }
        })

        await Content.create(...datatToInsert).then(() => {
            console.log('✅ Content Seeder')
        })
    } catch (error) {
        console.log(`❗️ Content Seeder Error | ${error}`)
    }

    // Categories
    try {
        const brand = await Brand.findOne({ code: 'fc' })
        const country = await Country.findOne({ code: 'ae' })

        let categoriesRawdata = fs.readFileSync('seeder-data/categories.json')
        let contents = await JSON.parse(categoriesRawdata)

        let datatToInsert = []
        contents.forEach((eachContent) => {
            datatToInsert.push({
                slug: eachContent.slug,
                name: {
                    en: eachContent.name.en,
                    ar: eachContent.name.ar,
                },
                description: {
                    en: eachContent.description.en,
                    ar: eachContent.description.ar,
                },
                position: eachContent.position,
                brand: brand,
                country,
                image: {
                    en: {
                        media_url: eachContent.image.en.media_url,
                        media_id: eachContent.image.en.media_id,
                    },
                    ar: {
                        media_url: eachContent.image.ar.media_url,
                        media_id: eachContent.image.ar.media_id,
                    },
                },
                published: true,
            })
        })

        await Category.create(...datatToInsert).then(() => {
            console.log('✅ Category Seeder')
        })
    } catch (error) {
        console.log(`❗️ Category Seeder Error | ${error}`)
    }

    // Products
    try {
        const brand = await Brand.findOne({ code: 'fc' })
        const countries = collect(await Country.find())
        const categories = collect(await Category.find())

        let productsRawdata = fs.readFileSync('seeder-data/products.json')
        let contents = await JSON.parse(productsRawdata)

        let datatToInsert = []
        contents.forEach(async (eachContent) => {
            const category = categories
                .where('slug', eachContent.category_slug)
                .first()
            const country = countries.where('name.en', 'UAE').first()
            datatToInsert.push({
                slug: eachContent.slug,
                name: {
                    en: eachContent.name.en,
                    ar: eachContent.name.ar,
                },
                description: {
                    en: eachContent.description.en,
                    ar: eachContent.description.ar,
                },
                terms_and_conditions: {
                    en: eachContent.terms_and_conditions.en,
                    ar: eachContent.terms_and_conditions.ar,
                },
                sales_price: eachContent.sales_price,
                actual_price: eachContent.actual_price,
                product_type: eachContent.product_type || 'regular',
                category: category,
                brand: brand,
                country: country._id,
                image: eachContent.image,
                semnox: {
                    id: eachContent.semnox.id,
                    name: eachContent.semnox.name,
                },
                featured: eachContent.featured || false,
                published: true,
            })
        })

        await Product.create(...datatToInsert).then(() => {
            console.log('✅ Product Seeder')
        })
    } catch (error) {
        console.log(`❗️ Product Seeder Error | ${error}`)
    }

    // Coupons
    try {
        const brand = await Brand.findOne({ code: 'fc' })
        const country = collect(await Country.findOne({ code: 'ae' }))
        const products = collect(await Product.find())

        let couponsRawdata = fs.readFileSync('seeder-data/coupons.json')
        let contents = await JSON.parse(couponsRawdata)

        let datatToInsert = []
        contents.forEach(async (eachContent) => {
            datatToInsert.push({
                ...eachContent,
                start_date: '2022-09-16',
                brand: brand,
                country: country._id,
                published: true,
                products: products.pluck('_id').toArray(),
                free_product: products.pluck('_id').toArray()[0],
                // users: [],
            })
        })

        await Coupon.create(...datatToInsert).then(() => {
            console.log('✅ Coupon Seeder')
        })
    } catch (error) {
        console.log(`❗️ Coupon Seeder Error | ${error}`)
    }

    // Dummy Orders
    // try {
    //     const user = await User.findOne({ email: 'ebrahim@iotics.me' })
    //     const brand = await Brand.findOne({ code: 'fc' })
    //     const country = await Country.findOne({ code: 'ae' })
    //     const coupon = await Coupon.findOne().select(
    //         '-__v -created_at -updated_at'
    //     )

    //     let datatToInsert = [
    //         {
    //             order_no: 'FC-AE-4569636589',
    //             user: user,
    //             brand: brand,
    //             country: country,
    //             amount: 98.56,
    //             amount_to_pay: 98.56,
    //             amount_from_card: 98.56,
    //             currency: 'aed',
    //             paid_at: new Date(),
    //             paid_at: new Date(),
    //             payment_status: 'pending',
    //             semnox_status: 'pending',
    //             order_status: 'success',
    //             payment_method: 'online',
    //         },
    //         {
    //             order_no: 'FC-AE-4569636590',
    //             user: user,
    //             brand: brand,
    //             country: country,
    //             amount: 135.56,
    //             amount_to_pay: 135.56,
    //             amount_from_card: 135.56,
    //             currency: 'aed',
    //             paid_at: new Date(),
    //             paid_at: new Date(),
    //             payment_status: 'pending',
    //             semnox_status: 'pending',
    //             order_status: 'success',
    //             payment_method: 'online',
    //             coupon: coupon._id,
    //             coupon_log: coupon,
    //         },
    //     ]

    //     await Order.create(...datatToInsert).then(() => {
    //         console.log('✅ Order Seeder')
    //     })
    // } catch (error) {
    //     console.log(`❗️ Order Seeder Error | ${error}`)
    // }

    // Settings
    try {
        const author = await Admin.findOne({ email: 'ebrahim@iotics.me' })
        const country = await Country.findOne({ code: 'ae' })
        const brand = await Brand.findOne({ code: 'fc' })

        await Settings.create({
            author,
            brand,
            country,
            semnox_base_url: 'https://pam-test.funcity.ae/api',
            semnox_login_id: 'restapi',
            semnox_password: 'restapi',
            semnox_site_id: '1013',
            // semnox_site_id: '1013',
            semnox_machine_name: 'webplatform',
            semnox_package_group_id: '2',
            semnox_free_product_group_id: '1',
            cache_expiry_time: 3600,
        }).then(() => {
            console.log('✅ Settings Seeder')
        })
    } catch (error) {
        console.log(`❗️ Settings Seeder Error | ${error}`)
    }

    // Media
    try {
        await Media.collection.drop()
        console.log('✅ Media Seeder')
    } catch (error) {
        console.log(`❗️ Media Seeder Error | ${error}`)
    }

    // Config
    try {
        await Config.collection.drop()
        await Config.create({ order_no: 0 }).then(() => {
            console.log('✅ Config Seeder')
        })
    } catch (error) {
        console.log(`❗️ Config Seeder Error | ${error}`)
    }

    // FormData
    try {
        await FormData.collection.drop()
        console.log('✅ FormData Seeder')
    } catch (error) {
        console.log(`❗️ FormData Seeder Error | ${error}`)
    }

    // Menu
    try {
        const brand = await Brand.findOne({ code: 'fc' })
        const attractionType = await ContentType.findOne({ slug: 'attraction' })
        const attractions = await Content.find({
            brand: brand._id,
            type_id: attractionType._id,
            published: true,
            isDeleted: false,
        })
        const packages = await Product.find({ brand: brand })

        let attractionsURLsToInsert = []
        let packagesURLsToInsert = []
        attractions.forEach((eachAttraction) => {
            attractionsURLsToInsert.push({
                _id: Types.ObjectId(),
                label: {
                    en: eachAttraction.content.en.title,
                    ar: eachAttraction.content.en.title,
                },
                menu_type: 'header_nav',
                url: {
                    en: `/attractions/${eachAttraction.slug}`,
                    ar: `/attractions/${eachAttraction.slug}`,
                    external: false,
                },
                position: 0,
            })
        })

        packages.forEach((eachPackage) => {
            packagesURLsToInsert.push({
                _id: Types.ObjectId(),
                label: {
                    en: eachPackage.name.en,
                    ar: eachPackage.name.ar,
                },
                // menu_type: 'header_nav',
                url: {
                    en: `/packages/${eachPackage.slug}`,
                    ar: `/packages/${eachPackage.slug}`,
                    external: false,
                },
                position: 0,
            })
        })

        await Menu.create(
            {
                nav_label: 'Top Nav',
                nav_position: 'top_nav',
                brand: brand,
                // country: brand.domains[0].country,
                nav_items: [
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Home',
                            ar: 'الصفحة الرئيسية ',
                        },
                        menu_type: 'header_nav',
                        url: { en: '/', ar: '/' },
                        position: 0,
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'About Us',
                            ar: 'نبذة عنا',
                        },
                        menu_type: 'header_nav',
                        url: { en: '/about', ar: '/about' },
                        position: 1,
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Attractions',
                            ar: 'الالعاب ',
                        },
                        menu_type: 'header_nav',
                        url: { en: '/attractions', ar: '/attractions' },
                        position: 2,
                        child: attractionsURLsToInsert,
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Packages',
                            ar: 'الباقات ',
                        },
                        menu_type: 'header_nav',
                        url: { en: '/packages', ar: '/packages' },
                        position: 3,
                        // child: packagesURLsToInsert,
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Promotions',
                            ar: 'العروض  ',
                        },
                        menu_type: 'header_nav',
                        url: { en: '/promotions', ar: '/promotions' },
                        position: 3,
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Birthdays',
                            ar: 'حفلات اعياد الميلاد ',
                        },
                        menu_type: 'header_nav',
                        url: {
                            en: '/birthdays',
                            ar: '/birthdays',
                        },
                        position: 3,
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Store Locator',
                            ar: 'المواقع',
                        },
                        menu_type: 'header_nav',

                        url: { en: '/storelocator', ar: '/storelocator' },
                        position: 3,
                    },
                ],
            },
            {
                nav_label: 'Bottom Nav',
                nav_position: 'bottom_nav',
                brand: brand,
                // country: brand.domains[0].country,
                nav_items: [
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Explore',
                            ar: 'Explore',
                        },
                        url: { en: '#', ar: '#' },
                        position: 0,
                        child: [
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'About Us',
                                    ar: 'نبذة عنا',
                                },
                                url: {
                                    en: '/about',
                                    ar: '/about',
                                },
                            },
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'Promotions',
                                    ar: 'العروض  ',
                                },
                                url: {
                                    en: '/promotions',
                                    ar: '/promotions',
                                },
                            },
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'Birthdays',
                                    ar: 'حفلات اعياد الميلاد ',
                                },
                                url: {
                                    en: '/birthdays',
                                    ar: '/birthdays',
                                },
                            },
                        ],
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Play',
                            ar: 'Play',
                        },
                        url: { en: '#', ar: '#' },
                        position: 1,
                        child: attractionsURLsToInsert,
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Help',
                            ar: 'Help',
                        },
                        url: { en: '#', ar: '#' },
                        position: 1,
                        child: [
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'Store Locator',
                                    ar: 'Store Locator',
                                },
                                url: { en: '#', ar: '#' },
                                position: 2,
                            },
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'FAQs',
                                    ar: 'FAQs',
                                },
                                url: { en: '#', ar: '#' },
                                position: 3,
                            },
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'Play by the rules',
                                    ar: 'Play by the rules',
                                },
                                url: { en: '#', ar: '#' },
                                position: 4,
                            },
                        ],
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Country',
                            ar: 'Country',
                        },
                        url: { en: '#', ar: '#' },
                        position: 1,
                        child: [
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'Bahrain',
                                    ar: 'Bahrain',
                                },
                                url: { en: '#', ar: '#' },
                                position: 2,
                            },
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'Kuwait',
                                    ar: 'Kuwait',
                                },
                                url: { en: '#', ar: '#' },
                                position: 3,
                            },
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'Oman',
                                    ar: 'Oman',
                                },
                                url: { en: '#', ar: '#' },
                                position: 4,
                            },
                            {
                                _id: Types.ObjectId(),
                                label: {
                                    en: 'UAE',
                                    ar: 'UAE',
                                },
                                url: { en: '#', ar: '#' },
                                position: 4,
                            },
                        ],
                    },
                ],
            },
            {
                nav_label: 'Generic Nav',
                nav_position: 'generic_nav',
                brand: brand,
                // country: brand.domains[0].country,
                nav_items: [
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'About Us',
                            ar: 'نبذة عنا',
                        },
                        url: {
                            en: '/about',
                            ar: '/about',
                        },
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Contact',
                            ar: 'اتصل بنا',
                        },
                        url: {
                            en: '/contact',
                            ar: '/contact',
                        },
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Legal',
                            ar: 'اتصل بنا',
                        },
                        url: {
                            en: '/legal',
                            ar: '/legal',
                        },
                    },
                    {
                        _id: Types.ObjectId(),
                        label: {
                            en: 'Terms',
                            ar: 'اتصل بنا',
                        },
                        url: {
                            en: '/terms',
                            ar: '/terms',
                        },
                    },
                ],
            }
        ).then(() => {
            console.log('✅ Menu Seeder')
        })
    } catch (error) {
        console.log(`❗️ Menu Seeder Error | ${error}`)
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
