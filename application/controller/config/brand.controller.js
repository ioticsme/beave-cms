const path = require('path')
const express = require('express')
const Joi = require('joi')
const bcrypt = require('bcrypt')

const Admin = require('../../model/Admin')
const Brand = require('../../model/Brand')
const Language = require('../../model/Language')
const Country = require('../../model/Country')

const list = async (req, res)  => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const brands = await Brand.find()
    return res.render('admin/config/brand/listing', {
        brands,
    })
}

const add = async (req, res)  => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const languages = await Language.find()
    const countries = await Country.find()
    return res.render('admin/config/brand/form', {
        languages,
        countries,
        isEdit: false,
    })
}

const edit = async (req, res)  => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const languages = await Language.find()
    const countries = await Country.find()
    const brand = await Brand.findOne({
        _id: req.params.id,
    })
    // res.send(contentType)
    return res.render('admin/config/brand/form', {
        languages,
        countries,
        brand,
        isEdit: true,
    })
}

const save = async (req, res)  => {
    const schema = Joi.object({
        name: Joi.string().required().min(3).max(60),
        code: Joi.string().required().min(2).max(10),
        languages: Joi.array().required().min(1),
        domains: Joi.array().required().min(1),
        active: Joi.boolean().optional(),
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
            en: req.body.name
        },
        code: req.body.code,
        languages: req.body.languages,
        domains: req.body.domains,
        active: req.body.active || false,
    }

    if (req.body.id) {
        await Brand.updateOne(
            {
                _id: req.body.id,
            },
            data
        )
    } else {
        await Brand.create(data)
    }

    return res.status(200).json('done')
}

const changeStatus = async (req, res) => {
    try {
        const { status, id } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Invalid data' })
        }

        // Upadte status field
        const update = await Brand.findOneAndUpdate(
            { _id: id },
            {
                $set: {
                    active: !status,
                },
            }
        )
        // If not updated
        if (!update?._id) {
            return res.status(404).json({ error: 'Activation error' })
        }
        return res.status(200).json({
            message: `Brand status changed`,
        })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
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
        await Brand.deleteOne({ _id: id })
        return res.status(200).json({
            message: `Brand Deleted`,
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
    changeStatus,
    deleteItem,
}
