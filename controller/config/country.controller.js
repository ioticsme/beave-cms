const path = require('path')
const express = require('express')
const Joi = require('joi')
const bcrypt = require('bcrypt')

const Country = require('../../model/Country')

const list = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const countries = await Country.find()
    return res.render('admin/config/country/listing', {
        countries,
    })
}

const add = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    // const contentTypes = await ContentType.find()
    return res.render('admin/config/country/form', {
        isEdit: false,
    })
}

const edit = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const country = await Country.findOne({
        _id: req.params.id,
    })
    // res.send(contentType)
    return res.render('admin/config/country/form', {
        country,
        isEdit: true,
    })
}

const save = async (req, res) => {
    // console.log(req.body)
    const schema = Joi.object({
        name: Joi.string().required().min(3).max(60),
        code: Joi.string().required().min(2).max(5),
        currency: Joi.string().required(),
        currency_symbol: Joi.string().required(),
        currency_decimal_points: Joi.number().required(),
        timezone: Joi.string().required(),
        id: Joi.optional(),
    })

    const validationResult = schema.validate(req.body, {
        abortEarly: false,
    })

    if (validationResult.error) {
        res.status(422).json(validationResult.error)
        return
    }

    let data = {
        name: {
            en: req.body.name,
        },
        code: req.body.code,
        currency: req.body.currency,
        currency_symbol: req.body.currency_symbol,
        currency_decimal_points: req.body.currency_decimal_points,
        timezone: req.body.timezone,
    }

    if (req.body.id) {
        await Country.updateOne(
            {
                _id: req.body.id,
            },
            data
        )
    } else {
        await Country.create(data)
    }

    return res.status(200).json('done')
}

const deleteItem = async (req, res) => {
    try {
        const { id } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Id not found' })
        }

        //soft delete item
        await Country.deleteOne({ _id: id })
        return res.status(200).json({
            message: `Country Deleted`,
        })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

module.exports = {
    list,
    add,
    edit,
    save,
    deleteItem,
}
