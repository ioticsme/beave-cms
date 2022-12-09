require('dotenv').config()
const Joi = require('joi')
const _ = require('lodash')
const Content = require('../../model/Content')
const ContentType = require('../../model/ContentType')
const Store = require('../../model/Store')

let session

// Render banner group list
const list = async (req, res) => {
    try {
        session = req.authUser
        const stores = await Store.find({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        res.render(`admin/cms/store/listing`, {
            data: stores,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Render form for add banner group
const add = async (req, res) => {
    try {
        const contentType = await ContentType.findOne({ slug: 'attraction' })
        let attractions = []
        if (contentType) {
            attractions = await Content.find({
                type_id: contentType._id,
                brand: req.authUser.selected_brand._id,
                country: req.authUser.selected_brand.country,
            })
        }
        res.render(`admin/cms/store/add`, { attractions })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Render form for add banner group
const edit = async (req, res) => {
    try {
        const contentType = await ContentType.findOne({ slug: 'attraction' })
        let attractions = []
        if (contentType) {
            attractions = await Content.find({
                type_id: contentType._id,
                brand: req.authUser.selected_brand._id,
                country: req.authUser.selected_brand.country,
            })
        }
        const store = await Store.findOne({
            _id: req.params?.id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
            deletedAt: null,
        })
        res.render(`admin/cms/store/edit`, { attractions, store })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Add new Banner group
const save = async (req, res) => {
    try {
        session = req.authUser
        // BEGIN:: Validation rule
        let nameValidationObj = {}
        let addressValidationObj = {}
        let cityValidationObj = {}
        let hoursValidationObj = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(nameValidationObj, {
                [lang.prefix]: eval(`Joi.string().required().min(5).max(30)`),
            })
            _.assign(addressValidationObj, {
                [lang.prefix]: eval(`Joi.string().required().min(15).max(200)`),
            })
            _.assign(cityValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
            _.assign(hoursValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
        })
        const schema = Joi.object({
            id: Joi.optional(),
            name: { ...nameValidationObj },
            address: { ...addressValidationObj },
            city: { ...cityValidationObj },
            opening_hours: { ...hoursValidationObj },
            phone: Joi.string().required().min(10).max(15),
            email: Joi.string().email().required(),
            lat: Joi.number().required(),
            lng: Joi.number().required(),
            // weekdays_opening_hours: Joi.string().required(),
            // offdays_opening_hours: Joi.string().optional().allow(null, ''),
            attractions: Joi.array().required(),
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

        // Data object to insert
        let data = {
            name: body.name,
            address: body.address,
            city: body.city,
            contact: { phone: body.phone, email: body.email },
            coordinates: { lat: body.lat, lng: body.lng },
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
            opening_hours: body.opening_hours,
            attractions: body.attractions,
        }

        if (isEdit) {
            // Update store
            const update = await Store.updateOne({ _id: body.id }, data)
            return res
                .status(201)
                .json({ message: 'Store updated successfully' })
        } else {
            // Create store
            const save = await Store.create(data)
            if (!save?._id) {
                return res.status(400).json({ error: 'Something went wrong' })
            }
            return res.status(200).json({ message: 'Store added successfully' })
        }
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
        // Soft delete banner
        await Store.softDelete({ _id: id })
        return res.status(200).json({
            message: 'Store deleted',
        })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

const changeStatus = async (req, res) => {
    try {
        const { status, id } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Invalid data' })
        }
        // Upadte
        const update = await Store.findOneAndUpdate(
            { _id: id },
            {
                $set: {
                    active: !status,
                },
            }
        )
        // If not updated
        if (!update?._id) {
            return res.status(404).json({ error: 'Something went wrong' })
        }
        return res.status(200).json({
            message: 'Store status changed',
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
    changeStatus,
}
