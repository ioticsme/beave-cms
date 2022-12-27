const Joi = require('joi')
const { default: mongoose } = require('mongoose')
const { verifyCaptcha } = require('../../helper/Captcha.helper')
const { sendEmail } = require('../../helper/Mail.helper')
// const Content = require('../../node_modules/@ioticsme/cms/model/Content')
const CustomForm = require('../../model/CustomForm')
const CustomFormData = require('../../model/CustomFormData')
const FormData = require('../../model/FormData')
const ContentResource = require('../../resources/api/content.resource')

const customFormSubmit = async (req, res) => {
    try {
        // console.log(req.body)
        // Finding custom form with type
        let customForm = await CustomForm.findOne({
            type: req.body.type,
            brand: req.brand,
            country: req.country,
            isDeleted: false,
        })
        if (!customForm?._id) {
            return res.status(422).json({ error: 'Invalid custom form' })
        }
        // Creating dynamic validation rules
        let cfValidationObj = {}
        const joiStart = `Joi.`
        customForm?.custom_fields.forEach((element) => {
            cfValidationObj[element.field_name] = eval(
                joiStart + element.validation.replace(',', '.')
            )
        })

        // BEGIN:: Validation rule
        const schema = Joi.object({
            type: Joi.string().required(),
            ...cfValidationObj,
        })
        // END:: Validation rule

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
            customForm.has_captcha &&
            (process.env.NODE_ENV == 'production' ||
                process.env.NODE_ENV == 'staging')
        ) {
            const isVerified = await verifyCaptcha(req.body.token)
            if (!isVerified) {
                return res
                    .status(400)
                    .json({ error: 'captcha token not verified' })
            }
        }
        // Dynamic custom field values
        let cfValues = {}
        for (i = 0; i < customForm.custom_fields?.length; i++) {
            let cf = customForm.custom_fields[i]
            let value = req.body?.[cf.field_name]
            if (cf.field_type) {
                let ObjectId = mongoose.Types.ObjectId
                if (!ObjectId.isValid(req.body?.[cf.field_name])) {
                    return res.status(422).json({ error: 'Invalid content' })
                }
                let content = await Content.findOne({
                    _id: req.body?.[cf.field_name],
                })
                value = new ContentResource(content).exec()
            }
            cfValues = {
                ...cfValues,
                [cf.field_name]: value,
            }
        }

        // Data to insert
        const data = {
            form_id: customForm._id,
            type: req.body.type,
            field_values: cfValues,
            brand: req.brand._id,
            country: req.country._id,
        }

        let save = await CustomFormData.create(data)

        // BEGIN:: Sending Email
        const brand_notification_settings =
            req.brand.settings?.notification_settings

        let mg_settings = brand_notification_settings?.mailgun
        if (mg_settings) {
            if (customForm.reply_email_template && req.body.email) {
                sendEmail(
                    mg_settings.from || 'noreply@funcity.ae',
                    req.body.email,
                    `${customForm.form_name} Form Submitted`,
                    customForm.reply_email_template,
                    {},
                    mg_settings
                )
            }

            if (
                customForm.reply_email_template &&
                customForm.recepient_emails
            ) {
                sendEmail(
                    mg_settings.from || 'noreply@funcity.ae',
                    customForm.recepient_emails.split(','),
                    `${customForm.form_name} Form Submission`,
                    customForm.reply_email_template,
                    req.body,
                    mg_settings
                )
            }
        }

        if (!save?._id) {
            return res.status(400).json({ error: 'Submission error' })
        }
        return res
            .status(200)
            .json({ message: 'Custom Form Submitted', data: save })
    } catch (error) {
        console.log(error)
        return res
            .status(500)
            .json({ error: error ? error : 'Something went wrong' })
    }
}

module.exports = {
    customFormSubmit,
}
