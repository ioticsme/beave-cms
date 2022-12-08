import * as dotenv from 'dotenv'
// const mongoose = require("mongoose");
import * as path from 'path'
import { Express, Request, Response } from 'express'
import Joi from 'joi'

dotenv.config({ path: '../../../../.env' })

const Admin = require('../../../../../model/Admin')
const Brand = require('../../../../../model/Brand')
const Language = require('../../../../../model/Language')
const Country = require('../../../../../model/Country')

const list = async (req, res)  => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const brands = await Brand.find()
    return res.render(path.join(__dirname, '../../views/brand', 'index'), {
        brands,
    })
}

const add = async (req, res)  => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const languages = await Language.find()
    const countries = await Country.find()
    return res.render(path.join(__dirname, '../../views/brand', 'form'), {
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
    return res.render(path.join(__dirname, '../../views/brand', 'form'), {
        languages,
        countries,
        brand,
        isEdit: true,
    })
}

const save = async (req, res)  => {
    console.log(req.body)
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

module.exports = {
    list,
    add,
    edit,
    save,
}
