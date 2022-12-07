const Joi = require('joi')
const { verifyCaptcha } = require('../../helper/Captcha.helper')
const { sendEmail } = require('../../helper/Mail.helper')
// const Content = require('../../node_modules/@ioticsme/cms/model/Content')
const FormData = require('../../model/FormData')

const contactFormSubmit = async (req, res) => {
    try {
        const schema = Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            mobile: Joi.string().required(),
            message: Joi.string().required(),
            token: Joi.string().required(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json({
                details: validationResult.error.details,
            })
        }

        // Verifying captcha with token
        if (
            process.env.NODE_ENV == 'production' ||
            process.env.NODE_ENV == 'staging'
        ) {
            const isVerified = await verifyCaptcha(req.body.token)
            if (!isVerified) {
                return res
                    .status(400)
                    .json({ error: 'captcha token not verified' })
            }
        }

        const data = {
            ...req.body,
            type: 'contact-form',
            brand: req.brand._id,
            country: req.country._id,
        }

        const save = await FormData.create(data)

        // BEGIN:: Sending Email
        const brand_notification_settings =
            req.brand.settings?.notification_settings

        let mg_settings = brand_notification_settings.mailgun
        sendEmail(
            mg_settings.from || 'noreply@funcity.ae',
            req.body.email,
            `Contact Form Submitted`,
            'funcity-contact-form-confirmation',
            {},
            mg_settings
        )
        if (brand_notification_settings?.communication_channels?.email) {
            sendEmail(
                mg_settings.from || 'noreply@funcity.ae',
                brand_notification_settings?.communication_channels?.email,
                `Contact Form Submission From ${req.body.name}`,
                'funcity-contact-form',
                {
                    name: req.body.name,
                    email: req.body.email,
                    mobile: req.body.mobile,
                    message: req.body.message,
                },
                mg_settings
            )
        }

        if (!save?._id) {
            return res.status(400).json({ error: 'Submission error' })
        }
        return res.status(200).json({ message: 'Form Submitted' })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const birthdayFormSubmit = async (req, res) => {
    // return res.json(
    //     req.brand.settings?.notification_settings?.mailgun
    // )
    try {
        const schema = Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            mobile: Joi.string().required(),
            date: Joi.date().required(),
            time: Joi.string().required(),
            store: Joi.string().required(),
            package_id: Joi.string().required(),
            comment: Joi.string().required(),
            token: Joi.string().required(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json({
                details: validationResult.error.details,
            })
        }

        // Verifying captcha with token
        if (
            process.env.NODE_ENV == 'production' ||
            process.env.NODE_ENV == 'staging'
        ) {
            const isVerified = await verifyCaptcha(req.body.token)
            if (!isVerified) {
                return res
                    .status(400)
                    .json({ error: 'captcha token not verified' })
            }
        }

        const package = await Content.findOne({
            _id: req.body.package_id,
            type_slug: 'birthday-package',
            brand: req.brand._id,
            country: req.country._id,
            published: true,
            isDeleted: false,
        })

        if (!package?._id) {
            return res.status(404).json({ error: 'Package not found' })
        }

        const store = await Content.findOne({
            _id: req.body.store,
            type_slug: 'store',
            published: true,
            isDeleted: false,
        })

        if (!store?._id) {
            return res.status(404).json({ error: 'Store not found' })
        }

        const data = {
            ...req.body,
            type: 'birthday-package',
            brand: req.brand._id,
            country: req.country._id,
        }

        const save = await FormData.create(data)

        if (!save?._id) {
            return res.status(400).json({ error: 'Submission error' })
        }

        const brand_notification_settings =
            req.brand.settings?.notification_settings

        // BEGIN:: Sending Email
        let mg_settings = brand_notification_settings.mailgun
        sendEmail(
            mg_settings.from || 'noreply@funcity.ae',
            req.body.email,
            `Birthday Form Submitted`,
            'funcity-birthday-form-confirmation',
            {},
            mg_settings
        )
        if (
            brand_notification_settings?.communication_channels?.email ||
            store?.content?.common?.email
        ) {
            sendEmail(
                mg_settings.from || 'noreply@funcity.ae',
                [
                    brand_notification_settings?.communication_channels?.email,
                    store?.content?.common?.email,
                ],
                `Birthday Form Submission From ${req.body.name}`,
                'funcity-birthday-form',
                {
                    name: req.body.name,
                    email: req.body.email,
                    mobile: req.body.mobile,
                    date: req.body.date,
                    time: req.body.time,
                    store: store.content.en.title,
                    party: package.content.en.title,
                    message: req.body.comment,
                },
                mg_settings
            )
        }

        return res
            .status(200)
            .json({ message: 'Birthday form submitted', data: save })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

module.exports = {
    contactFormSubmit,
    birthdayFormSubmit,
}
