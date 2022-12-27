require('dotenv').config()
const _ = require('lodash')
const slugify = require('slugify')
const Joi = require('joi')
const formData = require('form-data')
const Mailgun = require('mailgun.js')
const CustomForm = require('../../model/CustomForm')
const ContentType = require('../../model/ContentType')
const CustomFormData = require('../../model/CustomFormData')
const { mailGunTemplates } = require('../../helper/Mailgun.helper')

let session

const list = async (req, res) => {
    try {
        session = req.authUser

        const forms = await CustomForm.find({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        res.render(`admin/custom-forms/listing`, {
            data: forms,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const edit = async (req, res) => {
    try {
        session = req.authUser
        const form = await CustomForm.findOne({
            _id: req.params.id,
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
            isDeleted: false,
        })
        const domainTemplates = await mailGunTemplates(
            req.brand?.settings?.notification_settings?.mailgun
        )
        res.render(`admin/custom-forms/edit`, {
            form,
            domainTemplates,
        })
    } catch (error) {
        console.log(error)
        return res.render(`admin/error-404`)
    }
}

const add = async (req, res) => {
    try {
        session = req.authUser
        const domainTemplates = await mailGunTemplates(
            req.brand?.settings?.notification_settings?.mailgun
        )
        res.render(`admin/custom-forms/add`, { domainTemplates })
    } catch (error) {
        console.log(error)
        return res.render(`admin/error-500`)
    }
}

const save = async (req, res) => {
    try {
        session = req.authUser
        // BEGIN:: Validation rule
        const schema = Joi.object({
            id: Joi.optional(),
            custom_fields: Joi.optional(),
            form_name: Joi.string().required(),
            reply_email_template: Joi.string().optional().allow(null, ''),
            has_captcha: Joi.boolean().optional().allow(null, ''),
            recepient_emails: Joi.string().optional().allow(null, ''),
            recepient_email_template: Joi.string().optional().allow(null, ''),
            slack_url: Joi.string().optional().allow(null, ''),
            field_name: Joi.array().items(Joi.string()).required(),
            // field_type: Joi.array().items(Joi.optional()).optional(),
            field_validation: Joi.array().items(Joi.string()).required(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            res.status(422).json(validationResult.error)
            return
        }

        let isEdit = false
        let body = req.body

        if (body.id) {
            isEdit = true
        }

        if (!isEdit) {
            const isExist = await CustomForm.findOne({
                type: slugify(body.form_name.toLowerCase()),
                isDeleted: false,
            })
            if (isExist) {
                return res
                    .status(404)
                    .json({ error: 'Custom Form already exist' })
            }
        }

        let custom_fields = []
        for (i = 0; i < req.body.field_name.length; i++) {
            if (req.body.field_name?.[i]) {
                let obj = {
                    field_name: req.body.field_name?.[i],
                    validation: req.body.field_validation?.[i].replace(
                        /\s+/g,
                        ''
                    ),
                    // field_type: req.body.field_type?.[i]
                    //     ? req.body.field_type?.[i]
                    //     : null,
                }
                custom_fields.push(obj)
            }
        }

        // Data object to insert
        let data = {
            form_name: body.form_name,
            type: slugify(body.form_name.toLowerCase()),
            reply_email_template: req.body.reply_email_template,
            has_captcha: req.body.has_captcha || false,
            recepient_emails: req.body.recepient_emails.replace(/\s+/g, ''),
            recepient_email_template: req.body.recepient_email_template,
            slack_url: req.body.slack_url,
            custom_fields,
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        }

        if (isEdit) {
            // Update banner
            const update = await CustomForm.updateOne({ _id: body.id }, data)
            return res.status(201).json({
                message: 'Custom Form updated successfully',
                redirect_to: '/admin/custom-forms',
            })
        } else {
            // Create CustomForm
            const save = await CustomForm.create(data)
            if (!save?._id) {
                return res.status(400).json({ error: 'Something went wrong' })
            }
            return res.status(200).json({
                message: 'Custom Form added successfully',
                redirect_to: '/admin/custom-forms',
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const changeStatus = async (req, res) => {
    try {
        const { status, id } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Invalid data' })
        }
        // Update
        const update = await CustomForm.findOneAndUpdate(
            {
                _id: id,
                brand: req.authUser.selected_brand._id,
                country: req.authUser.selected_brand.country,
            },
            {
                $set: {
                    published: !status,
                },
            }
        )
        // If not updated
        if (!update?._id) {
            return res.status(404).json({ error: 'Something went wrong' })
        }
        return res.status(200).json({
            message: 'Custom Form status changed',
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const deleteForm = async (req, res) => {
    try {
        const { id } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Id not found' })
        }

        await CustomForm.softDelete({
            _id: id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        return res.status(200).json({
            message: 'Custom form deleted',
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const viewSubmissions = async (req, res) => {
    try {
        session = req.authUser

        const submissions = await CustomFormData.find({
            form_id: req.params.id,
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        res.render(`admin/custom-forms/submissions`, {
            data: submissions,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

module.exports = {
    list,
    edit,
    add,
    save,
    changeStatus,
    deleteForm,
    viewSubmissions,
}
