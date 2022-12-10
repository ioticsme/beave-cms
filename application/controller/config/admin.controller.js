// import * as dotenv from 'dotenv'
// dotenv.config({ path: '../../../../.env' })
// const mongoose = require("mongoose");
const path = require('path')
const express = require('express')
const Joi = require('joi')
const bcrypt = require('bcrypt')

const Admin = require('../../model/Admin')
const { object } = require('joi')

const list = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const admins = await Admin.find()
    return res.render('admin/config/admin/listing', {
        admins,
    })
}

const add = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    // const contentTypes = await ContentType.find()
    return res.render('admin/config/admin/form', {
        isEdit: false,
    })
}

const edit = async (req, res) => {
    // return res.sendFile('./views/index.html', {root: './node_modules/cms-installer'});
    const admin = await Admin.findOne({
        _id: req.params.id,
    })
    // console.log('admin :>> ', admin);
    // res.send(contentType)
    return res.render('admin/config/admin/form', {
        admin,
        isEdit: true,
    })
}

const save = async (req, res) => {
    // console.log(req.body)

    const saltRounds = 10
    const salt = bcrypt.genSaltSync(saltRounds)

    const schema = Joi.object({
        name: Joi.string().required().min(3).max(60),
        email: Joi.string().required().min(3).max(60),
        password: Joi.string().required().min(3).max(20),
        role: Joi.string().required().valid('admin'),
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

    let options = {
        email: req.body.email,
    }
    if (req.body.id) {
        options._id = { $ne: req.body.id }
    }
    const adminExist = await Admin.findOne(options)
    if (adminExist) {
        return res.status(422).json({
            details: [
                {
                    message: '"email" is already taken',
                    path: ['email'],
                    type: 'string.duplicate',
                    context: {
                        label: 'email',
                        value: req.body.email,
                        key: 'email',
                    },
                },
            ],
        })
    }

    let data = {
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync('password', salt),
        role: req.body.role,
        active: req.body.active || false,
    }

    if (req.body.id) {
        await Admin.updateOne(
            {
                _id: req.body.id,
            },
            data
        )
    } else {
        await Admin.create(data)
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
        const update = await Admin.findOneAndUpdate(
            { _id: id, role: { $ne: 'super_admin' } },
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
            message: `Admin status changed`,
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
        await Admin.deleteOne({ _id: id, role: { $ne: 'super_admin' } })
        return res.status(200).json({
            message: `Admin Deleted`,
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
