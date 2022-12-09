require('dotenv').config()
const _ = require('lodash')
const slugify = require('slugify')
const Joi = require('joi')
const Content = require('../../model/Content')
const Country = require('../../model/Country')
const fs = require('fs')
const { uploadMedia } = require('../../helper/Operations.helper')
const { formatInTimeZone } = require('date-fns-tz')
const Banner = require('../../model/Banner')
const Gallery = require('../../model/Gallery')
const { default: collect } = require('collect.js')
const Redis = require('../../helper/Redis.helper')

let session

const list = async (req, res) => {
    try {
        session = req.authUser
        const contentList = await Content.find({
            type_id: req.contentType._id,
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        }).sort('position')
        res.render(`admin/cms/content/listing`, {
            reqContentType: req.contentType,
            data: contentList,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const detail = async (req, res) => {
    try {
        session = req.authUser
        const contentDetail = await Content.findOne({
            _id: req.params.id,
            type_id: req.contentType._id,
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        }).populate('author')
        res.render(`admin/cms/content/detail`, {
            reqContentType: req.contentType,
            contentDetail,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const add = async (req, res) => {
    try {
        session = req.authUser
        let allowed_content = {}
        const banners = await Banner.find({
            brand: session?.selected_brand?._id,
            country: session?.selected_brand?.country,
            banner_type: 'web',
            published: true,
        })
        const gallery = await Gallery.find({
            brand: session?.selected_brand?._id,
            country: session?.selected_brand?.country,
            published: true,
        })
        if (req.contentType?.allowed_type?.length) {
            const data = await Content.find({
                brand: session?.selected_brand?._id,
                country: session?.selected_brand?.country,
                published: true,
                type_slug: { $in: req.contentType.allowed_type },
            })
            const collection = collect(data)
            const grouped = collection.groupBy('type_slug')
            allowed_content = JSON.parse(JSON.stringify(grouped.items))
        }

        const has_common_custom_fields = collect(req.contentType.custom_fields)
            .where('bilingual', false)
            .count()
        res.render(`admin/cms/content/add`, {
            reqContentType: req.contentType,
            has_common_custom_fields: has_common_custom_fields ? true : false,
            allowed_content,
            banners,
            gallery,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const edit = async (req, res) => {
    try {
        session = req.authUser
        let allowed_content = {}
        const banners = await Banner.find({
            brand: session?.selected_brand?._id,
            country: session?.selected_brand?.country,
            banner_type: 'web',
            published: true,
        })
        const gallery = await Gallery.find({
            brand: session?.selected_brand?._id,
            country: session?.selected_brand?.country,
            published: true,
        })
        const contentDetail = await Content.findOne({
            _id: req.params.id,
            type_id: req.contentType._id,
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        if (req.contentType?.allowed_type?.length) {
            const data = await Content.find({
                brand: session?.selected_brand?._id,
                country: session?.selected_brand?.country,
                published: true,
                type_slug: { $in: req.contentType.allowed_type },
            })
            const collection = collect(data)
            const grouped = collection.groupBy('type_slug')
            allowed_content = JSON.parse(JSON.stringify(grouped.items))
        }
        const has_common_custom_fields = collect(req.contentType.custom_fields)
            .where('bilingual', false)
            .count()
        res.render(`admin/cms/content/edit`, {
            reqContentType: req.contentType,
            has_common_custom_fields: has_common_custom_fields ? true : false,
            contentDetail,
            allowed_content,
            banners,
            gallery,
        })
    } catch (error) {
        // console.log(error)
        return res.render(`admin/error-404`)
    }
}

const deleteContent = async (req, res) => {
    try {
        const { id } = req.body
        const slug = req.contentType.slug
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Id not found' })
        }

        await Content.softDelete({
            _id: id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        return res.status(200).json({
            message: 'Content deleted',
            url: `/cms/${slug}`,
        })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}
const changeStatus = async (req, res) => {
    try {
        const { status, id } = req.body
        const slug = req.contentType?.slug
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Invalid data' })
        }
        // Upadte
        const update = await Content.findOneAndUpdate(
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
            url: `/cms/${slug}`,
        })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

const save = async (req, res) => {
    try {
        session = req.authUser
        // BEGIN:: Generating default field validation rule for content type (title, description)
        let defaultValidationObj = {}
        const titleValidationRules = `Joi.string().required()`
        const descriptionValidationRules = `Joi.string().required().min(10)`
        const excerptValidationRules = `Joi.string().allow('',null)`
        const titleValidationObj = {}
        const descriptionValidationObj = {}
        const excerptValidationObj = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(titleValidationObj, {
                [lang.prefix]: eval(titleValidationRules),
            })
            _.assign(descriptionValidationObj, {
                [lang.prefix]: eval(descriptionValidationRules),
            })
            _.assign(excerptValidationObj, {
                [lang.prefix]: eval(excerptValidationRules),
            })
        })

        defaultValidationObj['title'] = Joi.object(titleValidationObj)
        defaultValidationObj['body_content'] = Joi.object(
            descriptionValidationObj
        )
        defaultValidationObj['excerpt'] = Joi.object(excerptValidationObj)
        // ========= Output of the above code is : ==========
        // title: Joi.object({
        // 	en: Joi.string().required().max(200),
        // 	ar: Joi.string().required().max(200),
        // }),
        // body_content: Joi.object({
        // 	en: Joi.string().required().min(50).max(2000),`
        // 	ar: Joi.string().required().min(50).max(2000),
        // }),

        // END:: Generating default field validation rule for content type (title, description)
        // BEGIN:: Generating custom field validation rule for content type
        let cfValidationObj = {}
        req.contentType.custom_fields.forEach((element) => {
            let validationRules = ''
            element.validation.forEach((validationRule) => {
                validationRules += `.${validationRule}`
            })
            if (validationRules) {
                if (element.bilingual) {
                    const validationObject = {}
                    const URLvalidationObject = {}
                    if (element.field_type == 'file') {
                        req.authUser.selected_brand.languages.forEach(
                            (lang) => {
                                _.assign(validationObject, {
                                    [lang.prefix]: eval(
                                        req.body.method == 'add'
                                            ? element.addValidation ||
                                                  'Joi.optional().allow(null,"")'
                                            : element.editValidation ||
                                                  'Joi.optional().allow(null,"")'
                                    ),
                                })
                                _.assign(URLvalidationObject, {
                                    [lang.prefix]: eval(`Joi.optional()`),
                                })
                            }
                        )
                        cfValidationObj[element.field_name] =
                            Joi.object(validationObject)
                        cfValidationObj[`${element.field_name}-url`] =
                            Joi.object(URLvalidationObject)
                    } else {
                        req.authUser.selected_brand.languages.forEach(
                            (lang) => {
                                _.assign(validationObject, {
                                    [lang.prefix]: eval(
                                        `Joi${validationRules}`
                                    ),
                                })
                            }
                        )
                        cfValidationObj[element.field_name] =
                            Joi.object(validationObject)
                    }
                } else {
                    cfValidationObj[element.field_name] = eval(
                        `Joi${validationRules}`
                    )
                }
            }
        })
        // END:: Generating custom field validation rule for content type

        // BEGIN:: Validation rule
        const schema = Joi.object({
            _id: Joi.optional(),
            method: Joi.string().valid('add', 'edit'),
            ...defaultValidationObj,
            ...cfValidationObj,
            slug: Joi.object({
                en: Joi.optional(),
                ar: Joi.optional(),
            }),
            banner: Joi.optional(),
            gallery: Joi.optional(),
            attached_type: Joi.optional(),
            published: Joi.string().required().valid('true', 'false'),
            in_home: Joi.string().required().valid('true', 'false'),
            position: Joi.number().required(),
            meta_title: Joi.object({
                en: Joi.optional(),
                ar: Joi.optional(),
            }),
            meta_description: Joi.object({
                en: Joi.optional(),
                ar: Joi.optional(),
            }),
            meta_keywords: Joi.object({
                en: Joi.optional(),
                ar: Joi.optional(),
            }),
        })
        // END:: Validation rule

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
        let isEdit = false
        let body = req.body
        if (body._id) {
            isEdit = true
        }
        let type = req.contentType
        const country = await Country.findOne({
            code: session.selected_brand.country_code,
        })
        let customData = {}
        let metaData = {}
        let images = {}

        // Upload image to imagekit
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
                    'Funcity/Content',
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
        let customErrors = []
        // If image files are present
        if (Object.keys(images) && Object.keys(images).length) {
            // Looping through the languages
            session?.selected_brand?.languages.map((lang) => {
                // Looping through content tyep custom fields
                req.contentType.custom_fields?.map((cf) => {
                    // If field type is file take value from images object o.w from req.body
                    if (cf.field_type === 'file') {
                        if (isEdit) {
                            // if user uplaod new iamge
                            if (images?.[cf.field_name]?.[lang.prefix]) {
                                customData[lang.prefix] = {
                                    ...customData[lang.prefix],
                                    [cf.field_name]:
                                        images[cf.field_name][lang.prefix] ||
                                        '',
                                }
                                // if image content have already uploaded image
                            } else if (
                                body?.[`${[cf.field_name]}-url`]?.[lang.prefix]
                            ) {
                                // this image data is in stringfied form so it is parsing json
                                let val = JSON.parse(
                                    body[`${[cf.field_name]}-url`][lang.prefix]
                                )
                                customData[lang.prefix] = {
                                    ...customData[lang.prefix],
                                    [cf.field_name]: val || '',
                                }
                            } else {
                                // If no image is uploaded and content have no iamge then the error object will push to customError array
                                customErrors.push({
                                    message: `${cf.field_name}.${lang.prefix} is not allowed to be empty`,
                                    path: [
                                        `${cf.field_name}`,
                                        `${lang.prefix}`,
                                    ],
                                })
                            }
                        } else {
                            customData[lang.prefix] = {
                                ...customData[lang.prefix],
                                [cf.field_name]:
                                    images[cf.field_name][lang.prefix] || '',
                            }
                        }
                    } else {
                        if (cf.bilingual) {
                            customData[lang.prefix] = {
                                ...customData[lang.prefix],
                                [cf.field_name]:
                                    body[cf.field_name]?.[lang.prefix] || '',
                            }
                        } else {
                            customData['common'] = {
                                ...customData['common'],
                                [cf.field_name]: body[cf.field_name] || '',
                            }
                        }
                    }
                })
                customData[lang.prefix] = {
                    ...customData[lang.prefix],
                    title: body.title?.[lang.prefix],
                    body_content: body.body_content?.[lang.prefix],
                    excerpt: body.excerpt?.[lang.prefix],
                }
                if (req.contentType.hide_meta == false) {
                    metaData[lang.prefix] = {
                        title: body.meta_title[lang.prefix],
                        description: body.meta_description[lang.prefix],
                        keywords: body.meta_keywords[lang.prefix],
                    }
                }
            })
        } else {
            session?.selected_brand?.languages.map((lang, langIndex) => {
                req.contentType.custom_fields?.map((cf, cfIndex) => {
                    if (cf.field_type === 'file') {
                        // Image editing start
                        if (isEdit) {
                            // if user uplaod new iamge
                            if (images?.[cf.field_name]?.[lang.prefix]) {
                                customData[lang.prefix] = {
                                    ...customData[lang.prefix],
                                    [cf.field_name]:
                                        images[cf.field_name][lang.prefix] ||
                                        '',
                                }
                                // if image content have already uploaded image
                            } else if (
                                body?.[`${[cf.field_name]}-url`]?.[lang.prefix]
                            ) {
                                // this image data is in stringfied form so it is parsing json
                                let val = JSON.parse(
                                    body[`${[cf.field_name]}-url`][lang.prefix]
                                )
                                customData[lang.prefix] = {
                                    ...customData[lang.prefix],
                                    [cf.field_name]: val || '',
                                }
                            } else {
                                // If no image is uploaded and content have no iamge then the error object will push to customError array
                                customErrors.push({
                                    message: `${cf.field_name}.${lang.prefix} is not allowed to be empty`,
                                    path: [
                                        `${cf.field_name}`,
                                        `${lang.prefix}`,
                                    ],
                                })
                            }
                        }
                    } else {
                        if (cf.bilingual) {
                            customData[lang.prefix] = {
                                ...customData[lang.prefix],
                                [cf.field_name]:
                                    body?.[cf.field_name]?.[lang.prefix] || '',
                            }
                        } else {
                            customData['common'] = {
                                ...customData['common'],
                                [cf.field_name]: body[cf.field_name] || '',
                            }
                        }
                    }
                })
                customData[lang.prefix] = {
                    ...customData[lang.prefix],
                    title: body.title?.[lang.prefix],
                    body_content: body.body_content?.[lang.prefix],
                    excerpt: body.excerpt?.[lang.prefix],
                }
                if (req.contentType.hide_meta == false) {
                    metaData[lang.prefix] = {
                        title: body.meta_title[lang.prefix] || undefined,
                        description:
                            body.meta_description[lang.prefix] || undefined,
                        keywords: body.meta_keywords?.[lang.prefix],
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
        // Data object to insert
        let data = {
            type_id: type._id,
            type_slug: type.slug,
            author: session.admin_id,
            // brand: session.selected_brand._id,
            banner: body?.banner || null, // If Requested content type has banner required
            gallery: body?.gallery || null, // If Requested content type has gallery required
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
            published: body.published === 'true',
            position: body.position,
            template_name: type.template_name,
            custom_fields: type.custom_fields,
            content: customData,
            meta: metaData,
            in_home: body.in_home || false,
        }
        // gettting attached contents
        // TODO Find Permenant solution for issue
        // ISSUE : Sometime the data get in the form of array sometime in the form of string
        if (
            Object?.keys(body.attached_type ? body.attached_type : {})?.length
        ) {
            attachedData = []
            Object.keys(body.attached_type).map((item) => {
                const itemDataType = typeof body.attached_type[item]
                if (body.attached_type?.[item]?.length) {
                    let obj = {
                        content_type: item,
                        items:
                            itemDataType == 'string'
                                ? body.attached_type[item].split(',')
                                : body.attached_type[item],
                    }
                    attachedData.push(obj)
                }
            })
            if (attachedData.length) {
                data.attached_type = attachedData
            }
        }
        const brandCode = req.authUser.selected_brand?.code
        const countryCode = req.authUser.selected_brand?.country_code

        if (isEdit) {
            data.slug = body.slug?.en
                ? slugify(body.slug?.en?.toLowerCase())
                : slugify(body.title.en.toLowerCase())
            const cache_key = `content-${brandCode}-${countryCode}-${type.slug}-${data.slug}`
            // Update content
            const update = await Content.updateOne({ _id: body._id }, data)
            Redis.removeCache([cache_key])
            return res
                .status(201)
                .json({ message: 'Content updated successfully' })
        } else {
            data.slug = slugify(body.title.en.toLowerCase())
            // Create content
            const save = await Content.create(data)
            if (!save?._id) {
                return res.status(400).json({ error: 'Something went wrong' })
            }
            const cache_key = `content-${brandCode}-${countryCode}-${type.slug}`
            Redis.removeCache([cache_key])

            return res.status(200).json({
                message: 'Content added successfully',
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

module.exports = {
    list,
    detail,
    edit,
    deleteContent,
    changeStatus,
    add,
    save,
}