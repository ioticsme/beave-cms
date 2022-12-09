require('dotenv').config()
const _ = require('lodash')
const slugify = require('slugify')
const Joi = require('joi')
const Banner = require('../../model/Banner')
const Country = require('../../model/Country')
const fs = require('fs')
const { uploadMedia } = require('../../helper/Operations.helper')
const { formatInTimeZone } = require('date-fns-tz')
const { default: collect } = require('collect.js')

let session

// Render banner group list
const list = async (req, res) => {
    try {
        session = req.authUser
        const banners = await Banner.find({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        res.render(`admin/cms/banner/listing`, {
            data: banners,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Render banner group detail page
const detail = async (req, res) => {
    try {
        const banner = await Banner.findOne({
            _id: req.params.id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        let bannerGroup = {}
        if (banner?._id) {
            const collection = collect(banner.banner_items)
            const sort = collection.sortBy('position')
            bannerGroup = {
                ...banner._doc,
                banner_items: sort.all(),
            }
        }
        res.render(`admin/cms/banner/detail`, {
            bannerGroup,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
// Render form for add banner group
const add = async (req, res) => {
    try {
        res.render(`admin/cms/banner/add`)
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
// Render form for edit banner group
const edit = async (req, res) => {
    try {
        const bannerDetail = await Banner.findOne({
            _id: req.params.id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        res.render(`admin/cms/banner/edit`, {
            bannerDetail,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Add new Banner group
const save = async (req, res) => {
    try {
        session = req.authUser
        // BEGIN:: Validation rule
        const schema = Joi.object({
            id: Joi.optional(),
            title: Joi.string().required(),
            in_home: Joi.string().required().valid('true', 'false'),
            banner_type: Joi.string().required().valid('web', 'app'),
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
            slug: slugify(body.title.toLowerCase()),
            in_home: body.in_home,
            banner_type: body.banner_type,
            published: body.published == 'true',
            author: session.admin_id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        }

        if (isEdit) {
            // Update banner
            const update = await Banner.updateOne(
                {
                    _id: body.id,
                    brand: req.authUser.selected_brand._id,
                    country: req.authUser.selected_brand.country,
                },
                data
            )
            return res
                .status(201)
                .json({ message: 'Banner updated successfully' })
        } else {
            const isExist = await Banner.findOne({
                slug: data.slug,
                brand: req.authUser.selected_brand._id,
                country: req.authUser.selected_brand.country,
            })
            if (isExist) {
                return res.status(404).json({ error: 'Banner already exist' })
            }
            // Create banner
            const save = await Banner.create(data)
            if (!save?._id) {
                return res.status(400).json({ error: 'Something went wrong' })
            }
            return res
                .status(200)
                .json({ message: 'Banner added successfully', content: save })
        }
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

// Render add banner item form
const addItems = async (req, res) => {
    try {
        const { id } = req.params
        const banner_group = await Banner.findOne({
            _id: id
        })
        res.render(`admin/cms/banner/add-items`, { groupId: id, banner_group })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Add new Banner item to banner group
const saveItems = async (req, res) => {
    try {
        session = req.authUser
        // BEGIN:: Validation rule
        let titleValidationObj = {}
        let descValidationObj = {}
        let btnTextValidationObj = {}
        let btnUrlValidationObj = {}
        req?.authUser?.selected_brand?.languages.forEach((lang) => {
            _.assign(titleValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
            _.assign(descValidationObj, {
                [lang.prefix]: eval(`Joi.optional()`),
            })
            _.assign(btnTextValidationObj, {
                [lang.prefix]: eval(
                    ` Joi.string().allow('',null).min(3).max(20)`
                ),
            })
            _.assign(btnUrlValidationObj, {
                [lang.prefix]: eval(`Joi.string().allow('',null).min(3)`),
            })
        })
        const schema = Joi.object({
            id: Joi.optional(),
            title: Joi.object({
                ...titleValidationObj,
            }),
            description: Joi.object({
                ...descValidationObj,
            }),
            btn_text: Joi.object({
                ...btnTextValidationObj,
            }),
            btn_url: Joi.object({
                ...btnUrlValidationObj,
            }),
            common_image: Joi.object({
                en: Joi.string().required(),
                ar: Joi.string().required(),
            }),
            mobile_image: Joi.object({
                en: Joi.string().allow('', null),
                ar: Joi.string().allow('', null),
            }),
            position: Joi.number().required(),
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
                let fieldName = req.files[i].fieldname.split('.')[0]
                let fieldLang = req.files[i].fieldname.split('.')[1]
                const media = await uploadMedia(
                    base64,
                    'Funcity/Banners',
                    file.filename
                ) //file.originalname
                // Deleting the image saved to uploads/
                fs.unlinkSync(`uploads/${file.filename}`)
                if (media && media._id) {
                    images[fieldName] = {
                        ...images[fieldName],
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

        // Getting multi language data dynamically
        let title = {}
        let description = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(title, {
                [lang.prefix]: body.title?.[lang.prefix],
            })
            _.assign(description, {
                [lang.prefix]: body.description?.[lang.prefix],
            })
        })
        // Data object to insert
        let data = {
            title,
            description,
            btn_text: body.btn_text,
            btn_url: body.btn_url,
            position: body.position,
            images: images,
        }
        let save = await Banner.findOneAndUpdate(
            { _id: req.params?.id },
            {
                $push: {
                    banner_items: data,
                },
            }
        )

        if (!save?._id) {
            return res.status(400).json({ error: 'Something went wrong' })
        }
        return res
            .status(200)
            .json({ message: 'Banner item added successfully' })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

// render Edit banner item page
const editItems = async (req, res) => {
    try {
        const { id, itemId } = req.params
        const banner = await Banner.findOne({
            _id: id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        let item
        if (banner?._id) {
            item = banner.banner_items.find(
                (bannerItem) => bannerItem._id.toString() == itemId
            )
        }
        res.render(`admin/cms/banner/edit-items`, {
            item: item ? item : {},
            groupId: banner._id,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}
// Edit Banner Item of a group
const saveEditItems = async (req, res) => {
    try {
        session = req.authUser
        // BEGIN:: Validation rule
        let titleValidationObj = {}
        let descValidationObj = {}
        let btnTextValidationObj = {}
        let btnUrlValidationObj = {}
        req?.authUser?.selected_brand?.languages.forEach((lang) => {
            _.assign(titleValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
            _.assign(descValidationObj, {
                [lang.prefix]: eval(`Joi.optional()`),
            })
            _.assign(btnTextValidationObj, {
                [lang.prefix]: eval(` Joi.string().allow('',null).min(3)`),
            })
            _.assign(btnUrlValidationObj, {
                [lang.prefix]: eval(`Joi.string().allow('',null).min(3)`),
            })
        })
        const schema = Joi.object({
            id: Joi.optional(),
            group_id: Joi.string().required(),
            title: Joi.object({
                ...titleValidationObj,
            }),
            description: Joi.object({
                ...descValidationObj,
            }),
            btn_text: Joi.object({
                ...btnTextValidationObj,
            }),
            btn_url: Joi.object({
                ...btnUrlValidationObj,
            }),
            common_image: Joi.object({
                en: Joi.string().allow('', null),
                ar: Joi.string().allow('', null),
            }),
            mobile_image: Joi.object({
                en: Joi.string().allow('', null),
                ar: Joi.string().allow('', null),
            }),
            common_image_url: Joi.optional(),
            mobile_image_url: Joi.optional(),
            position: Joi.number().required(),
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
                    if (!body.common_image?.[lang.prefix]) {
                        if (!body.common_image_url?.[lang.prefix]) {
                            customErrors.push({
                                message: `common_image.${lang.prefix} is not allowed to be empty`,
                                path: [`common_image`, `${lang.prefix}`],
                            })
                        }
                    }
                    if (!body.mobile_image?.[lang.prefix]) {
                        if (body.mobile_image_url?.[lang.prefix]) {
                            images.mobile_image = {
                                ...images.mobile_image,
                                [lang.prefix]: JSON.parse(
                                    body.mobile_image_url?.[lang.prefix]
                                ),
                            }
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
                let fieldName = req.files[i].fieldname.split('.')[0]
                let fieldLang = req.files[i].fieldname.split('.')[1]
                const media = await uploadMedia(
                    base64,
                    'Funcity/Banners',
                    file.filename
                ) //file.originalname
                // Deleting the image saved to uploads/
                fs.unlinkSync(`uploads/${file.filename}`)
                if (media && media._id) {
                    images[fieldName] = {
                        ...images[fieldName],
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
                if (images?.common_image?.[lang.prefix]?.media_url) {
                    images.common_image = {
                        ...images.common_image,
                        [lang.prefix]: images?.common_image?.[lang.prefix],
                    }
                } else if (body.common_image_url?.[lang.prefix]) {
                    images.common_image = {
                        ...images.common_image,
                        [lang.prefix]: JSON.parse(
                            body.common_image_url[lang.prefix]
                        ),
                    }
                } else {
                    customErrors.push({
                        message: `common_image.${lang.prefix} is not allowed to be empty`,
                        path: [`common_image`, `${lang.prefix}`],
                    })
                }
            })
        } else {
            req.authUser.selected_brand.languages.forEach((lang) => {
                if (body.common_image_url?.[lang.prefix]) {
                    images.common_image = {
                        ...images.common_image,
                        [lang.prefix]: JSON.parse(
                            body.common_image_url[lang.prefix]
                        ),
                    }
                } else {
                    customErrors.push({
                        message: `common_image.${lang.prefix} is not allowed to be empty`,
                        path: [`common_image`, `${lang.prefix}`],
                    })
                }
                if (body.mobile_image_url?.[lang.prefix]) {
                    images.mobile_image = {
                        ...images.mobile_image,
                        [lang.prefix]: JSON.parse(
                            body.mobile_image_url?.[lang.prefix]
                        ),
                    }
                }
            })
        }

        if (customErrors?.length) {
            return res.status(422).json({
                _original: req.body,
                details: customErrors,
            })
        }

        // Getting multi language data dynamically
        let title = {}
        let description = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(title, {
                [lang.prefix]: body.title?.[lang.prefix],
            })
            _.assign(description, {
                [lang.prefix]: body.description?.[lang.prefix],
            })
        })
        // Data object to insert
        let data = {
            _id: body.id,
            title,
            description,
            btn_text: body.btn_text,
            btn_url: body.btn_url,
            position: body.position,
            images: images,
        }
        let banner = await Banner.findOne({ _id: body.group_id })
        if (!banner?._id) {
            return res.status(400).json({ error: 'Banner group not found' })
        }

        let update = await Banner.findOneAndUpdate(
            { 'banner_items._id': body.id },
            {
                $set: {
                    'banner_items.$': data,
                },
            }
        )

        if (!update?._id) {
            return res.status(400).json({ error: 'Something went wrong' })
        }
        return res
            .status(200)
            .json({ message: 'Banner item updated successfully' })
    } catch (error) {
        // console.log(error)
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

const deleteBanner = async (req, res) => {
    try {
        const { id } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Id not found' })
        }
        // Soft delete banner
        await Banner.softDelete({
            _id: id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        return res.status(200).json({
            message: 'Banner deleted',
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
        const update = await Banner.findOneAndUpdate(
            {
                _id: id,
                brand: req.authUser.selected_brand._id,
                country: req.authUser.selected_brand.country,
            },
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

const deleteBannerItem = async (req, res) => {
    try {
        const { id, group_id } = req.body
        // If id not found
        if (!id || !group_id) {
            return res.status(404).json({ error: 'Id not found' })
        }
        // Upadte
        const update = await Banner.findOneAndUpdate(
            {
                _id: group_id,
                brand: req.authUser.selected_brand._id,
                country: req.authUser.selected_brand.country,
            },
            {
                $pull: {
                    banner_items: {
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
            message: 'Banner Item deleted',
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
    deleteBanner,
    changeStatus,
    add,
    save,
    saveItems,
    saveEditItems,
    deleteBannerItem,
}
