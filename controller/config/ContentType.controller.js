const path = require('path')
const express = require('express')
const Joi = require('joi')
const bcrypt = require('bcrypt')
const ContentType = require('../../model/ContentType')

const list = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const contentTypes = await ContentType.find()
    console.log('contentTypes :>> ', contentTypes[0]);
    return res.render('admin/config/content-type/listing', {
        contentTypes,
    })
}

const add = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    // const contentTypes = await ContentType.find()
    return res.render(
        'admin/config/content-type/form',
        {
            isEdit: false,
        }
    )
}

const edit = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const contentType = await ContentType.findOne({
        _id: req.params.id,
    })
    // res.send(contentType)
    return res.render(
        'admin/config/content-type/edit-form',
        {
            contentType,
            isEdit: true,
        }
    )
}

const save = async (req, res) => {
    // console.log(req.body)
    const schema = Joi.object({
        title: Joi.string().required().min(3).max(60),
        slug: Joi.string().required().min(3).max(60),
        template_name: Joi.string().required().min(3).max(60),
        nav_position: Joi.number().required(),
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
        field_label: Joi.array().optional(),
        field_name: Joi.array().optional(),
        placeholder: Joi.array().optional(),
        validation: Joi.array().optional(),
        bilingual: Joi.array().optional(),
        field_type: Joi.array().optional(),
        option_label: Joi.array().optional(),
        option_value: Joi.array().optional(),
        id: Joi.optional(),
    })

    const validationResult = schema.validate(req.body, {
        abortEarly: false,
    })

    if (validationResult.error) {
        res.status(422).json(validationResult.error)
        return
    }

    let custom_fields = []
    for (let i = 0; i < req.body.field_name.length; i++) {
        if (req.body.field_name?.[i]) {
            let obj = {
                field_label: req.body.field_label?.[i],
                field_name: req.body.field_name?.[i],
                placeholder: req.body.placeholder?.[i],
                validation: req.body.validation?.[i].split(','),
                bilingual: req.body.bilingual?.[i],
                field_type: req.body.field_type?.[i],
                options: {},
            }
            let options = []
            for (
                let j = 0;
                j < req.body.option_label?.[i]?.split(',').length;
                j++
            ) {
                if (req.body.option_value?.[i]?.split(',')?.[j]) {
                    options.push({
                        label: req.body.option_label?.[i]?.split(',')?.[j],
                        value: req.body.option_value?.[i]?.split(',')?.[j],
                    })
                }
            }
            obj.options = options
            custom_fields.push(obj)
        }
    }

    let data = {
        title: req.body.title,
        slug: slugify(req.body.slug.toLowerCase()),
        template_name: req.body.template_name,
        position: req.body.nav_position,
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
        custom_fields,
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

    return res.status(200).json('done')
}

module.exports = {
    list,
    add,
    edit,
    save,
}
