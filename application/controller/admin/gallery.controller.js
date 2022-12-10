require('dotenv').config()
const _ = require('lodash')
const slugify = require('slugify')
const Joi = require('joi')
const Gallery = require('../../model/Gallery')
const Country = require('../../model/Country')
const fs = require('fs')
const { uploadMedia } = require('../../helper/Operations.helper')
const { formatInTimeZone } = require('date-fns-tz')
const { join } = require('path')
const { default: collect } = require('collect.js')

let session

// Render gallery group list
const list = async (req, res) => {
    try {
        session = req.authUser
        const gallery = await Gallery.find({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        res.render(`admin/cms/gallery/listing`, {
            data: gallery,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Render gallery group detail page
const detail = async (req, res) => {
    try {
        const gallery = await Gallery.findOne({
            _id: req.params.id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        let galleryGroup = {}
        if (gallery?._id) {
            const collection = collect(gallery.gallery_items)
            const sort = collection.sortBy('position')
            galleryGroup = {
                ...gallery._doc,
                gallery_items: sort.all(),
            }
        }
        res.render(`admin/cms/gallery/detail`, {
            galleryGroup,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
// Render form for add gallery group
const add = async (req, res) => {
    try {
        res.render(`admin/cms/gallery/add`)
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
// Render form for edit gallery group
const edit = async (req, res) => {
    try {
        const galleryDetail = await Gallery.findOne({
            _id: req.params.id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        res.render(`admin/cms/gallery/edit`, {
            galleryDetail,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Add new Gallery group
const save = async (req, res) => {
    try {
        session = req.authUser
        // BEGIN:: Validation rule
        const schema = Joi.object({
            id: Joi.optional(),
            title: Joi.string().required(),
            description: Joi.object({
                en: Joi.string().required(),
                ar: Joi.string().required(),
            }),
            in_home: Joi.string().required().valid('true', 'false'),
            published: Joi.string().required(),
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
        const country = await Country.findOne({
            code: session.selected_brand.country_code,
        })

        // Data object to insert
        let data = {
            title: body.title,
            description: body.description,
            slug: slugify(body.title.toLowerCase()),
            in_home: body.in_home,
            published: body.published == 'true',
            author: session.admin_id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        }

        if (isEdit) {
            // Update gallery
            const update = await Gallery.updateOne({ _id: body.id }, data)
            return res
                .status(201)
                .json({ message: 'Gallery updated successfully' })
        } else {
            const isExist = await Gallery.findOne({ slug: data.slug })
            if (isExist) {
                return res.status(404).json({ error: 'Gallery already exist' })
            }
            // Create gallery
            const save = await Gallery.create(data)
            if (!save?._id) {
                return res.status(400).json({ error: 'Something went wrong' })
            }
            return res
                .status(200)
                .json({ message: 'Gallery added successfully' })
        }
    } catch (error) {
        // console.log(error)
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

// Render add gallery item form
const addItems = async (req, res) => {
    try {
        const { id } = req.params
        res.render(`admin/cms/gallery/add-items`, { groupId: id })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Add new Gallery item to gallery group
const saveItems = async (req, res) => {
    try {
        session = req.authUser
        // BEGIN:: Validation rule
        const schema = Joi.object({
            id: Joi.optional(),
            position: Joi.number().required(),
            image: Joi.object({
                en: Joi.string().required(),
                ar: Joi.string().required(),
            }),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            if (req.files && req.files.length) {
                for (i = 0; i < req.files.length; i++) {
                    let file = req.files[i]
                    // Deleting the image saved to uploads/
                    fs.unlinkSync(`uploads/${file.filename}`)
                }
            }
            res.status(422).json(validationResult.error)
            return
        }

        let body = req.body

        //BEGIN:: Media upload
        let images = {}
        if (req.files && req.files.length) {
            for (i = 0; i < req.files.length; i++) {
                let file = req.files[i]
                // Creating base64 from file
                const base64 = Buffer.from(fs.readFileSync(file.path)).toString(
                    'base64'
                )
                let fieldLang = req.files[i].fieldname.split('.')[1]
                const media = await uploadMedia(
                    base64,
                    'Funcity/Gallerys',
                    file.filename
                ) //file.originalname
                // Deleting the image saved to uploads/
                fs.unlinkSync(`uploads/${file.filename}`)
                if (media && media._id) {
                    images = {
                        ...images,
                        [fieldLang]: {
                            media_url: media.url,
                            media_id: media._id,
                        },
                    }
                } else {
                    return res.status(503).json({
                        error: 'Some error occured while uploading the image',
                    })
                }
            }
        }
        //END:: Media upload

        // Data object to insert
        let data = {
            position: body.position,
            image: images,
        }

        let save = await Gallery.findOneAndUpdate(
            { _id: req.params?.id },
            {
                $push: {
                    gallery_items: data,
                },
            }
        )

        if (!save?._id) {
            return res.status(400).json({ error: 'Something went wrong' })
        }
        return res
            .status(200)
            .json({ message: 'Gallery item added successfully' })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

// render Edit gallery item page
const editItems = async (req, res) => {
    try {
        const { id, itemId } = req.params
        const gallery = await Gallery.findOne({
            _id: id,
        })
        let item
        if (gallery?._id) {
            item = gallery.gallery_items.find(
                (galleryItem) => galleryItem._id.toString() == itemId
            )
        }
        res.render(`admin/cms/gallery/edit-items`, {
            item: item ? item : {},
            groupId: gallery?._id,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
// Edit Gallery Item of a group
const saveEditItems = async (req, res) => {
    try {
        session = req.authUser
        // BEGIN:: Validation rule
        const schema = Joi.object({
            id: Joi.optional(),
            group_id: Joi.string().required(),
            position: Joi.number().required(),
            image: Joi.object({
                en: Joi.optional(),
                ar: Joi.optional(),
            }),
            image_url: Joi.optional(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            if (req.files && req.files.length) {
                for (i = 0; i < req.files.length; i++) {
                    let file = req.files[i]
                    // Deleting the image saved to uploads/
                    fs.unlinkSync(`uploads/${file.filename}`)
                }
            }
            res.status(422).json(validationResult.error)
            return
        }

        let body = req.body

        //BEGIN:: Media upload
        let images = {}
        if (req.files && req.files.length) {
            for (i = 0; i < req.files.length; i++) {
                let customErrors = []
                req.authUser.selected_brand.languages.forEach((lang) => {
                    if (!body.image?.[lang.prefix]) {
                        if (!body.image_url?.[lang.prefix]) {
                            customErrors.push({
                                message: `image.${lang.prefix} is not allowed to be empty`,
                                path: [`image`, `${lang.prefix}`],
                            })
                        }
                    }
                })
                if (customErrors?.length) {
                    return res.status(422).json({
                        _original: req.body,
                        details: customErrors,
                    })
                }
                let file = req.files[i]
                // Creating base64 from file
                const base64 = Buffer.from(fs.readFileSync(file.path)).toString(
                    'base64'
                )
                let fieldLang = req.files[i].fieldname.split('.')[1]
                const media = await uploadMedia(
                    base64,
                    'Funcity/Gallerys',
                    file.filename
                ) //file.originalname
                // Deleting the image saved to uploads/
                fs.unlinkSync(`uploads/${file.filename}`)
                if (media && media._id) {
                    images = {
                        ...images,
                        [fieldLang]: {
                            media_url: media.url,
                            media_id: media._id,
                        },
                    }
                } else {
                    return res.status(503).json({
                        error: 'Some error occured while uploading the image',
                    })
                }
            }
        }
        //END:: Media upload

        let customErrors = []

        // Image Edit
        if (Object.keys(images)?.length) {
            req.authUser.selected_brand.languages.forEach((lang) => {
                if (images?.[lang.prefix]?.media_url) {
                    images = {
                        ...images,
                        [lang.prefix]: images[lang.prefix],
                    }
                } else if (body.image_url?.[lang.prefix]) {
                    images = {
                        ...images,
                        [lang.prefix]: JSON.parse(body.image_url[lang.prefix]),
                    }
                } else {
                    customErrors.push({
                        message: `image.${lang.prefix} is not allowed to be empty`,
                        path: [`image`, `${lang.prefix}`],
                    })
                }
            })
        } else {
            req.authUser.selected_brand.languages.forEach((lang) => {
                if (body.image_url?.[lang.prefix]) {
                    images = {
                        ...images,
                        [lang.prefix]: JSON.parse(body.image_url[lang.prefix]),
                    }
                } else {
                    customErrors.push({
                        message: `image.${lang.prefix} is not allowed to be empty`,
                        path: [`image`, `${lang.prefix}`],
                    })
                }
            })
        }

        if (customErrors?.length) {
            return res.status(422).json({
                _original: req.body,
                details: customErrors,
            })
        }

        // Data object to insert
        let data = {
            position: body.position,
            image: images,
        }

        // Checking the gallery group exist
        let gallery = await Gallery.findOne({ _id: body.group_id })
        if (!gallery?._id) {
            return res.status(400).json({ error: 'Gallery group not found' })
        }

        let update = await Gallery.findOneAndUpdate(
            { 'gallery_items._id': body.id },
            {
                $set: {
                    'gallery_items.$': data,
                },
            }
        )

        if (!update?._id) {
            return res.status(400).json({ error: 'Something went wrong' })
        }
        return res
            .status(200)
            .json({ message: 'Gallery item updated successfully' })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

const deleteGallery = async (req, res) => {
    try {
        const { id } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Id not found' })
        }
        // Soft delete gallery
        await Gallery.softDelete({ _id: id })
        return res.status(200).json({
            message: 'Gallery deleted',
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
        const update = await Gallery.findOneAndUpdate(
            { _id: id },
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
            message: 'Content status changed',
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const deleteGalleryItem = async (req, res) => {
    try {
        const { id, group_id } = req.body
        // If id not found
        if (!id || !group_id) {
            return res.status(404).json({ error: 'Id not found' })
        }
        // Upadte
        const update = await Gallery.findOneAndUpdate(
            { _id: group_id },
            {
                $pull: {
                    gallery_items: {
                        _id: id,
                    },
                },
            }
        )
        // If not updated
        if (!update?._id) {
            return res.status(404).json({ error: 'Something went wrong' })
        }

        return res.status(200).json({
            message: 'Gallery Item deleted',
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

module.exports = {
    list,
    detail,
    edit,
    editItems,
    addItems,
    deleteGallery,
    changeStatus,
    add,
    save,
    saveItems,
    saveEditItems,
    deleteGalleryItem,
}
