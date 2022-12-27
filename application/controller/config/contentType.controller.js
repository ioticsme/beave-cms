const path = require('path')
const express = require('express')
const Joi = require('joi')
const bcrypt = require('bcrypt')
const ContentType = require('../../model/ContentType')
const { default: slugify } = require('slugify')

const list = async (req, res) => {
    const contentTypes = await ContentType.find()
    return res.render('admin/config/content-type/listing', {
        contentTypes,
    })
}

const add = async (req, res) => {
    const contentTypes = await ContentType.find()
    return res.render('admin/config/content-type/form', {
        isEdit: false,
        contentTypes,
    })
}

const edit = async (req, res) => {
    const contentType = await ContentType.findOne({
        _id: req.params.id,
    })
    const contentTypes = await ContentType.find()
    return res.render('admin/config/content-type/form', {
        contentType,
        isEdit: true,
        contentTypes,
    })
}

const save = async (req, res) => {
    try {
        const schema = Joi.object({
            title: Joi.string().required().min(3).max(60),
            slug: Joi.string().required().min(3).max(60),
            template_name: Joi.string().required().min(3).max(60),
            position: Joi.number().required(),
            admin_icon: Joi.string().required(),
            has_banner: Joi.boolean().optional(),
            has_gallery: Joi.boolean().optional(),
            has_form: Joi.boolean().optional(),
            has_api_endpoint: Joi.boolean().optional(),
            hide_excerpt: Joi.boolean().optional(),
            hide_title: Joi.boolean().optional(),
            hide_body: Joi.boolean().optional(),
            hide_meta: Joi.boolean().optional(),
            in_use: Joi.boolean().optional(),
            repeater_group_label: Joi.array().optional(),
            repeater_group_name: Joi.array().optional(),
            field_label: Joi.array().optional(),
            field_name: Joi.array().optional(),
            placeholder: Joi.array().optional(),
            validation: Joi.array().optional(),
            bilingual: Joi.array().optional(),
            field_type: Joi.array().optional(),
            option_label: Joi.array().optional(),
            option_value: Joi.array().optional(),
            kt_docs_repeater_nested_outer: Joi.array().optional(),
            attachable_type: Joi.array(),
            id: Joi.optional(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            res.status(422).json(validationResult.error)
            return
        }

        let customFieldGroups = []
        req.body.kt_docs_repeater_nested_outer?.map((repeater) => {
            let fields = []
            repeater.kt_docs_repeater_nested_inner?.map((inner) => {
                let obj = {
                    field_label: inner.field_label,
                    field_name: inner.field_name,
                    placeholder: inner.placeholder,
                    validation: inner.validation,
                    bilingual: inner.bilingual || false,
                    field_type: inner.field_type,
                }
                let options = []
                for (
                    let j = 0;
                    j < inner.option_label?.split(',').length;
                    j++
                ) {
                    if (inner.option_value?.split(',')?.[j]) {
                        options.push({
                            label: inner.option_label?.split(',')?.[j],
                            value: inner.option_value.split(',')[j],
                        })
                    }
                }
                if (options.length) {
                    obj.options = options
                }
                fields.push(obj)
            })
            customFieldGroups.push({
                row_name: repeater.name,
                repeater_group: repeater.repeater_group ? true : false,
                bilingual: repeater.bilingual ? true : false,
                fields: fields,
            })
        })
        let data = {
            title: req.body.title,
            slug: slugify(req.body.slug.toLowerCase()),
            template_name: req.body.template_name,
            position: req.body.position,
            admin_icon: req.body.admin_icon,
            allowed_type: req.body.allowed_type || [],
            has_banner: req.body?.has_banner || false,
            has_gallery: req.body?.has_gallery || false,
            has_form: req.body?.has_form || false,
            hide_title: req.body.hide_title || false,
            hide_body: req.body.hide_body || false,
            hide_excerpt: req.body.hide_excerpt || false,
            hide_meta: req.body.hide_meta || false,
            in_use: req.body.in_use || false,
            custom_field_groups: customFieldGroups,
            allowed_type: req.body.attachable_type?.length
                ? req.body.attachable_type
                : null,
        }
        if (req.body.id) {
            await ContentType.updateOne(
                {
                    _id: req.body.id,
                },
                data
            )
        } else {
            await ContentType.create(data)
        }

        return res.status(200).json({ message: 'Content Type added' })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const deleteItem = async (req, res) => {
    try {
        const { id } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Id not found' })
        }

        //soft delete item
        await ContentType.deleteOne({ _id: id })
        return res.status(200).json({
            message: `Content Type Deleted`,
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

module.exports = {
    list,
    add,
    edit,
    save,
    deleteItem,
}
