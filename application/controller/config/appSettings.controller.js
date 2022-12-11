const path = require('path')
const express = require('express')
const Joi = require('joi')
const bcrypt = require('bcrypt')

const Config = require('../../model/Config')

const list = async (req, res) => {
    const configs = await Config.findOne().select(
        '-_id -__v -created_at -updated_at'
    )
    // console.log(configs.schema.path('order_no').options.Comment)
    // configs.schema.path(`${key}.${mixkey}`)?.instance || 'Mixed'
    // console.log(configs.schema.path('imagekit.public_key').instance)
    return res.render('admin/config/app-settings/listing', {
        configs,
    })
}

const save = async (req, res) => {
    // console.log(req.body)
    const schema = Joi.object({
        order_no: Joi.number().required().min(1),
        has_cms: Joi.boolean(),
        has_ecommerce: Joi.boolean(),
        has_semnox: Joi.boolean(),
        has_pam: Joi.boolean(),
        has_booknow: Joi.boolean(),
        imagekit: Joi.object({
            public_key: Joi.string().invalid('null').required(),
            private_key: Joi.string().invalid('null').required(),
            url: Joi.string().invalid('null').required(),
            folder: Joi.string().invalid('null').required(),
        }),
        // dir: Joi.string().required().valid('ltr', 'rtl'),
        // is_default: Joi.boolean().optional(),
        // id: Joi.optional(),
    })

    const validationResult = schema.validate(req.body, {
        abortEarly: false,
    })

    if (validationResult.error) {
        res.status(422).json(validationResult.error)
        return
    }

    await Config.deleteMany()
    const config = await Config.create(req.body)
    // console.log(config)
    globalModuleConfig = {
        has_cms: config.has_cms || false,
        has_ecommerce: config.has_ecommerce || false,
        has_semnox: config.has_semnox || false,
        has_pam: config.has_pam || false,
        has_booknow: config.has_booknow || false,
    }

    // await Config.updateOne(
    //     {
    //         _id: configRow.id,
    //     },
    //     req.body
    // )

    return res.status(200).json('done')
}

module.exports = {
    list,
    save,
}
