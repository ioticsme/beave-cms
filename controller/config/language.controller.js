const path = require('path')
const express = require('express')
const Joi = require('joi')
const bcrypt = require('bcrypt')

const Language = require('../../model/Language')

const list = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const languages = await Language.find()
    return res.render('admin/config/language/listing', {
        languages,
    })
}

const add = async (req, res) => { 
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    // const contentTypes = await ContentType.find()
    return res.render('admin/config/language/form', {
        isEdit: false,
    })
}

const edit = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const language = await Language.findOne({
        _id: req.params.id,
    })
    // res.send(contentType)
    return res.render('admin/config/language/form', {
        language,
        isEdit: true,
    })
}

const save = async (req, res) => {
    // console.log(req.body)
    const schema = Joi.object({
        name: Joi.string().required().min(3).max(60),
        prefix: Joi.string().required().min(2).max(5),
        dir: Joi.string().required().valid('ltr', 'rtl'),
        is_default: Joi.boolean().optional(),
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
        name: req.body.name,
        prefix: req.body.prefix,
        dir: req.body.dir,
        is_default: req.body.is_default || false,
    }

    if (req.body.id) {
        await Language.updateOne(
            {
                _id: req.body.id,
            },
            data
        )
    } else {
        await Language.create(data)
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
        await Language.deleteOne({ _id: id })
        return res.status(200).json({
            message: `Language Deleted`,
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
