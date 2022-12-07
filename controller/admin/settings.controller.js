require('dotenv').config()
const Joi = require('joi')
const fs = require('fs')
const _ = require('lodash')
const Brand = require('../../model/Brand')
const Country = require('../../model/Country')
var session = require('express-session')
const Settings = require('../../model/Settings')
const Redis = require('../../helper/Redis.helper')
const { uploadMedia } = require('../../helper/Operations.helper')

const switchBrand = async (req, res) => {
    try {
        if (req.query.b && req.query.d) {
            session = req.authUser
            const brand = await Brand.findOne({ _id: req.query.b }).populate(
                'languages'
            )
            const country = await Country.findOne({ code: req.query.d })
            const settings = await Settings.findOne({
                brand: brand?._id,
                country: country?._id,
            }).select('-brand -country -__v -created_at -updated_at -author')

            session.selected_brand = {
                _id: brand?._id,
                name: brand?.name,
                code: brand.code,
                languages: brand?.languages,
                country: country?._id,
                country_name: country?.name.en,
                country_code: req.query?.d,
                country_currency: country?.currency,
                country_currency_symbol: country?.currency_symbol,
                settings: settings ? settings : {},
            }
        }
        res.redirect('back')
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// General settings
const generalList = async (req, res) => {
    try {
        session = req.authUser
        const country = session.selected_brand.country
        const brand = await Brand.findOne({
            _id: session.selected_brand._id,
            'domains.country': session.selected_brand.country,
        }).populate('domains.country')
        let domain = {}
        if (brand?._id) {
            domain = brand.domains.find(
                (dom) => dom.country?._id.toString() == country
            )
        }
        return res.render('admin/settings/general/listing', {
            domain,
            brand,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
// Render logo edit form
const editLogo = async (req, res) => {
    try {
        session = req.authUser
        let data
        let isBrand = false
        if (req.query.brand == 'true') {
            data = await Brand.findOne({
                _id: session.selected_brand._id,
            })
            isBrand = true
        } else if (req.query.domain == 'true') {
            const country = req.params.id
            const brand = await Brand.findOne({
                _id: session.selected_brand._id,
                'domains.country': country,
            }).populate('domains.country')

            if (brand?._id) {
                data = brand.domains.find(
                    (dom) => dom.country?._id.toString() == country
                )
            }
        }
        return res.render('admin/settings/general/edit-logo-form', {
            data,
            isBrand,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Change logo
const changeLogo = async (req, res) => {
    try {
        const session = req.authUser
        let nameValidationObj = {}
        let imageValidationObj = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(nameValidationObj, {
                [lang.prefix]: eval(`Joi.string().required().min(3).max(60)`),
            })
            _.assign(imageValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
        })
        const schema = Joi.object({
            name: Joi.object({
                ...nameValidationObj,
            }),
            image: Joi.object({
                ...imageValidationObj,
            }),
            id: Joi.optional(),
            is_brand: Joi.optional(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            if (req.files && req.files.length) {
                for (i = 0; i < req.files.length; i++) {
                    let file = req.files[i]
                    // Deleting the image saved to uploads/
                    fs.unlinkSync(`uploads/${file.filename}`)
                }
            }
            return res.status(422).json(validationResult.error)
        }

        // Media upload starts
        let images = {}
        if (req.files && req.files.length) {
            for (i = 0; i < req.files.length; i++) {
                let file = req.files[i]
                // Creating base64 from file
                const base64 = Buffer.from(fs.readFileSync(file.path)).toString(
                    'base64'
                )
                let fieldLang = req.files[i].fieldname.split('.')[1]
                const media = await uploadMedia(
                    base64,
                    'Logos',
                    file.filename
                ) //file.originalname
                // Deleting the image saved to uploads/
                fs.unlinkSync(`uploads/${file.filename}`)
                if (media && media._id) {
                    images = {
                        ...images,
                        [fieldLang]: {
                            media_url: media.url,
                            media_id: media._id,
                        },
                    }
                } else {
                    return res.status(503).json({
                        error: 'Some error occured while uploading the image',
                    })
                }
            }
        }
        // Media upload ends
        let update
        if (req.body.is_brand == 'true') {
            update = await Brand.findOneAndUpdate(
                {
                    _id: session.selected_brand._id,
                },
                {
                    $set: {
                        logo: images,
                    },
                }
            )
        } else {
            update = await Brand.findOneAndUpdate(
                {
                    _id: session.selected_brand._id,
                    'domains.country': req.body.id,
                },
                {
                    $set: {
                        [`domains.$.logo`]: images,
                    },
                }
            )
        }

        if (!update?._id) {
            return res.status(400).json({ error: 'Something went wrong' })
        }
        return res.status(200).json({ message: 'Logo changed' })
    } catch (error) {
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

const changeBrandStatus = async (req, res) => {
    try {
        session = req.authUser
        const keys = {
            1: 'maintenance_mode',
            2: 'ecommerce_maintenance_mode',
        }
        const update = await Brand.findOneAndUpdate(
            {
                _id: session.selected_brand._id,
                'domains.country': session.selected_brand.country,
            },
            {
                $set: {
                    [`domains.$.${keys[req.body.mode]}`]: !req.body.status,
                },
            }
        )
        if (!update?._id) {
            return res.status(400).json({ error: 'Something went wrong' })
        }
        return res.status(200).json({ message: ' Status changed' })
    } catch (error) {
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

const clearCache = async (req, res) => {
    // Redis.flushCache()
    await Redis.clearCacheAll() // Removing all caches except user tokens
    return res.status(200).json({ message: 'Cache cleared' })
}

// Semnox settings
const semnoxList = async (req, res) => {
    if (!globalModuleConfig.has_semnox) {
        return res.render(`admin/error-404`)
    }
    try {
        session = req.authUser
        let settings = await Settings.findOne({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        // console.log(settings)
        if (!settings) settings = {}
        return res.render('admin/settings/semnox/list', { data: settings })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const semnoxSave = async (req, res) => {
    if (!globalModuleConfig.has_semnox) {
        return res.render(`admin/error-404`)
    }
    try {
        session = req.authUser
        const schema = Joi.object({
            semnox_base_url: Joi.string().required(),
            semnox_login_id: Joi.string().required(),
            semnox_password: Joi.string().required(),
            semnox_site_id: Joi.string().required(),
            semnox_machine_name: Joi.string().required(),
            // semnox_package_group_id: Joi.string().required(),
            // semnox_free_product_group_id: Joi.string().required(),
            // semnox_var_coupon_id: Joi.string().required().max(10),
            // semnox_has_toy_promo: Joi.boolean().required(),
            // semnox_toy_promo_value: Joi.number().required(),
            semnox_payment_mode: Joi.number().required(),
            semnox_free_toy_available: Joi.string().allow('true', 'false'),
            semnox_free_toy_threshold: Joi.number().required().min(0),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json(validationResult.error)
        }

        let body = req.body
        const brand = session.selected_brand._id
        const country = session.selected_brand.country
        const author = session.admin_id

        const save = await Settings.findOneAndUpdate(
            {
                brand: brand,
                country: country,
            },
            {
                $set: {
                    brand,
                    country,
                    author,
                    semnox_base_url: body.semnox_base_url,
                    semnox_login_id: body.semnox_login_id,
                    semnox_password: body.semnox_password,
                    semnox_site_id: body.semnox_site_id,
                    semnox_machine_name: body.semnox_machine_name,
                    // semnox_package_group_id: body.semnox_package_group_id,
                    // semnox_free_product_group_id:
                    //     body.semnox_free_product_group_id,
                    // semnox_var_coupon_id: body.semnox_var_coupon_id,
                    // semnox_has_toy_promo: body.semnox_has_toy_promo == 'true',
                    // semnox_toy_promo_value: body.semnox_toy_promo_value,
                    semnox_payment_mode: body.semnox_payment_mode,
                    semnox_free_toy_available: body.semnox_free_toy_available,
                    semnox_free_toy_threshold: body.semnox_free_toy_threshold,
                },
            },
            {
                upsert: true,
                new: true,
            }
        )
        session.selected_brand.settings = save
        Redis.removeCache([
            `semnox-products-${req.authUser.selected_brand.name.en}-${req.authUser.selected_brand.country_name}`,
            `semnox-auth-${req.authUser.selected_brand.name.en}-${req.authUser.selected_brand.country_name}`,
            `semnox-brand-${req.authUser.selected_brand.name.en}-${req.authUser.selected_brand.country_name}`,
        ])

        return res.status(200).json({ message: 'Settings updated' })
    } catch (error) {
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

// PAM settings
const pamList = async (req, res) => {
    if (!globalModuleConfig.has_pam) {
        return res.render(`admin/error-404`)
    }
    try {
        session = req.authUser
        let settings = await Settings.findOne({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        // console.log(settings)
        if (!settings) settings = {}
        return res.render('admin/settings/pam/list', {
            data: settings.pam_settings || {},
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const pamSave = async (req, res) => {
    if (!globalModuleConfig.has_pam) {
        return res.render(`admin/error-404`)
    }
    try {
        session = req.authUser
        const schema = Joi.object({
            location_id: Joi.string().required(),
            zone_id: Joi.string().required(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json(validationResult.error)
        }

        let body = req.body
        const brand = session.selected_brand._id
        const country = session.selected_brand.country
        const author = session.admin_id

        const save = await Settings.updateOne(
            {
                brand: brand,
                country: country,
            },
            {
                $set: {
                    brand,
                    country,
                    author,
                    pam_settings: {
                        location_id: body.location_id,
                        zone_id: body.zone_id,
                    },
                },
            },
            {
                upsert: true,
            }
        )
        Redis.removeCache([
            `semnox-products-${req.authUser.selected_brand.name.en}-${req.authUser.selected_brand.country_name}`,
            `semnox-auth-${req.authUser.selected_brand.name.en}-${req.authUser.selected_brand.country_name}`,
            `semnox-brand-${req.authUser.selected_brand.name.en}-${req.authUser.selected_brand.country_name}`,
        ])

        return res.status(200).json({ message: 'Settings updated' })
    } catch (error) {
        console.log(error)
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

// SEO settings
const seoList = async (req, res) => {
    try {
        session = req.authUser
        const brand = await Brand.findOne({
            _id: session.selected_brand._id,
            'domains.country': session.selected_brand.country,
        }).populate('domains.country')
        let data = {}
        if (brand?._id) {
            data = brand.domains.find(
                (dom) =>
                    dom.country?._id.toString() ==
                    session.selected_brand.country.toString()
            )
        }
        return res.render('admin/settings/seo/list', { data })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
const seoEdit = async (req, res) => {
    try {
        session = req.authUser
        const brand = await Brand.findOne({
            _id: session.selected_brand._id,
            'domains.country': session.selected_brand.country,
        }).populate('domains.country')
        let data = {}
        if (brand?._id) {
            data = brand.domains.find(
                (dom) =>
                    dom.country?._id.toString() ==
                    session.selected_brand.country.toString()
            )
        }
        return res.render('admin/settings/seo/form', { data })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const seoSave = async (req, res) => {
    try {
        session = req.authUser
        let titleValidationObj = {}
        let descValidationObj = {}
        let imageValidationObj = {}
        let keyValidationObj = {}
        req?.authUser?.selected_brand?.languages.forEach((lang) => {
            _.assign(titleValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
            _.assign(descValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
            _.assign(keyValidationObj, {
                [lang.prefix]: eval(` Joi.string().required()`),
            })
            _.assign(imageValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
        })
        const schema = Joi.object({
            title: Joi.object({
                ...titleValidationObj,
            }),
            description: Joi.object({
                ...descValidationObj,
            }),
            keywords: Joi.object({
                ...keyValidationObj,
            }),
            image: Joi.object({
                ...imageValidationObj,
            }),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            if (req.files && req.files.length) {
                for (i = 0; i < req.files.length; i++) {
                    let file = req.files[i]
                    // Deleting the image saved to uploads/
                    fs.unlinkSync(`uploads/${file.filename}`)
                }
            }
            return res.status(422).json(validationResult.error)
        }

        let body = req.body
        const brand = session.selected_brand._id
        const country = session.selected_brand.country
        const author = session.admin_id

        //BEGIN:: Media upload
        let images = {}
        if (req.files && req.files.length) {
            for (i = 0; i < req.files.length; i++) {
                let file = req.files[i]
                // Creating base64 from file
                const base64 = Buffer.from(fs.readFileSync(file.path)).toString(
                    'base64'
                )
                let fieldLang = req.files[i].fieldname.split('.')[1]
                const media = await uploadMedia(
                    base64,
                    'SEO',
                    file.filename
                ) //file.originalname
                // Deleting the image saved to uploads/
                fs.unlinkSync(`uploads/${file.filename}`)
                if (media && media._id) {
                    images = {
                        ...images,
                        [fieldLang]: {
                            media_url: media.url,
                            media_id: media._id,
                        },
                    }
                } else {
                    return res.status(503).json({
                        error: 'Some error occured while uploading the image',
                    })
                }
            }
        }
        //END:: Media upload

        // Getting multi language data dynamically
        let keywords = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(keywords, {
                [lang.prefix]: body.keywords?.[lang.prefix],
            })
        })
        const obj = {
            title: body.title,
            description: body.description,
            keywords,
            og_image: images,
        }

        const update = await Brand.findOneAndUpdate(
            {
                _id: session.selected_brand._id,
                'domains.country': session.selected_brand.country,
            },
            {
                $set: {
                    [`domains.$.meta`]: obj,
                },
            }
        )

        if (!update?._id) {
            return res.status(400).json({ error: 'Not updated' })
        }
        return res.status(200).json({ message: 'Settings updated' })
    } catch (error) {
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

// Marketing settings
const marketingList = async (req, res) => {
    try {
        session = req.authUser
        const brand = await Brand.findOne({
            _id: session.selected_brand._id,
        })

        return res.render('admin/settings/marketing/list', { data: brand })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
const marketingEdit = async (req, res) => {
    try {
        session = req.authUser
        const brand = await Brand.findOne({
            _id: session.selected_brand._id,
        })
        return res.render('admin/settings/marketing/form', { data: brand })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const marketingSave = async (req, res) => {
    try {
        session = req.authUser
        const schema = Joi.object({
            gtm_id: Joi.string().required().allow(''),
            google_analytics_id: Joi.string().required().allow(''),
            google_token: Joi.string().required().allow(''),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json(validationResult.error)
        }

        let body = req.body
        const brand = session.selected_brand._id

        const obj = {
            gtm_id: body.gtm_id,
            google_analytics_id: body.google_analytics_id,
            google_token: body.google_token,
        }

        const update = await Brand.findOneAndUpdate(
            {
                _id: brand,
            },
            {
                $set: {
                    marketing: obj,
                },
            }
        )

        if (!update?._id) {
            return res.status(400).json({ error: 'Not updated' })
        }
        return res.status(200).json({ message: 'Settings updated' })
    } catch (error) {
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

// Ecommerce Settings
const ecommerceList = async (req, res) => {
    try {
        session = req.authUser
        const settings = await Settings.findOne({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        return res.render('admin/settings/ecommerce/listing', {
            data: settings?.ecommerce_settings || {},
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
const invoiceEdit = async (req, res) => {
    try {
        session = req.authUser
        const settings = await Settings.findOne({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        return res.render('admin/settings/ecommerce/edit-invoice', {
            data: settings?.ecommerce_settings || {},
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const invoiceSave = async (req, res) => {
    try {
        session = req.authUser
        let addressValidationObj = {}
        let termsValidationObj = {}
        let footerValidationObj = {}
        req?.authUser?.selected_brand?.languages.forEach((lang) => {
            _.assign(addressValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
            _.assign(termsValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
            _.assign(footerValidationObj, {
                [lang.prefix]: eval(` Joi.string().required()`),
            })
        })
        const schema = Joi.object({
            invoice_address: Joi.object({
                ...addressValidationObj,
            }),
            terms_and_conditions: Joi.object({
                ...termsValidationObj,
            }),
            footer_text: Joi.object({
                ...footerValidationObj,
            }),
            frontend_url: Joi.string().required(),
            trn_number: Joi.string().required(),
            vat_percentage: Joi.number().required().max(99),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json(validationResult.error)
        }

        let body = req.body

        // Update settings
        const update = await Settings.findOneAndUpdate(
            {
                brand: session.selected_brand._id,
                country: session.selected_brand.country,
            },
            {
                $set: {
                    'ecommerce_settings.invoice_address': body.invoice_address,
                    'ecommerce_settings.terms_and_conditions':
                        body.terms_and_conditions,
                    'ecommerce_settings.footer_text': body.footer_text,
                    'ecommerce_settings.trn_number': body.trn_number,
                    'ecommerce_settings.frontend_url': body.frontend_url,
                    'ecommerce_settings.vat_percentage': parseFloat(
                        body.vat_percentage
                    ),
                },
            },
            {
                new: true,
                upsert: true,
            }
        )
        session.selected_brand.settings = update
        return res.status(200).json({ message: 'Settings updated' })
    } catch (error) {
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

// Notification Settings
const notificationList = async (req, res) => {
    try {
        session = req.authUser
        const settings = await Settings.findOne({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        return res.render('admin/settings/notification/listing', {
            data: settings?.notification_settings || {
                mailgun: {},
                sms: {},
                communication_channels: {},
            },
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const editNotificationSettings = async (req, res) => {
    try {
        session = req.authUser
        const settings = await Settings.findOne({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        return res.render('admin/settings/notification/edit', {
            title: req.params.type.replace('_', ' ').toUpperCase(),
            type: req.params.type,
            data: settings?.notification_settings || {
                mailgun: {},
                sms: {},
            },
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
const saveNoticationSettings = async (req, res) => {
    try {
        let session = req.authUser
        let body = req.body
        let schema
        if (body.type == 'sms') {
            schema = Joi.object({
                type: Joi.string(),
                sender_id: Joi.string().required(),
                username: Joi.string().required(),
                password: Joi.string().required(),
            })
        } else if (body.type == 'communication_channels') {
            schema = Joi.object({
                type: Joi.string().required(),
                email: Joi.string().required(),
            })
        } else if (body.type == 'mailgun') {
            schema = Joi.object({
                type: Joi.string(),
                from: Joi.string().required(),
                domain: Joi.string().required(),
                api_key: Joi.string().required(),
                otp_template: Joi.string().required(),
                forgot_password_template: Joi.string().required(),
                forgot_password_thankyou_template: Joi.string().required(),
                order_complete_template: Joi.string().required(),
                welcome_template: Joi.string().required(),
            })
        } else {
            return res.status(400).json({ error: 'Invalid Type' })
        }

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json(validationResult.error)
        }
        // Update settings
        const update = await Settings.findOneAndUpdate(
            {
                brand: session.selected_brand._id,
                country: session.selected_brand.country,
            },
            {
                $set: {
                    [`notification_settings.${body.type}`]: body,
                },
            },
            {
                new: true,
                upsert: true,
            }
        )
        session.selected_brand.settings = update
        return res.status(200).json({ message: 'Settings updated' })
    } catch (error) {
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

module.exports = {
    switchBrand,
    generalList,
    editLogo,
    changeLogo,
    changeBrandStatus,
    clearCache,
    semnoxList,
    semnoxSave,
    pamList,
    pamSave,
    seoList,
    seoEdit,
    seoSave,
    marketingList,
    marketingEdit,
    marketingSave,
    ecommerceList,
    invoiceEdit,
    invoiceSave,
    notificationList,
    editNotificationSettings,
    saveNoticationSettings,
}
