require('dotenv').config()
const Joi = require('joi')
const slugify = require('slugify')
const fs = require('fs')
const _ = require('lodash')
const Category = require('../../model/Category')
const Product = require('../../model/Product')
const Country = require('../../model/Country')
const { formatInTimeZone } = require('date-fns-tz')
const { uploadMedia } = require('../../helper/Operations.helper')
const { getProductPriceController } = require('../../helper/Semnox.helper')
const { getPamMemberships } = require('../../helper/PAM.helper')

let session

const catalogItems = {
    1: 'Category',
    2: 'Product',
}

const categories = async (req, res) => {
    try {
        session = req.authUser
        // let brand = session.selected_brand
        const categories = await Category.find({
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        }).sort('position')
        return res.render(`admin/ecommerce/catalog/category/listing`, {
            categories,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const categoryDetail = async (req, res) => {
    try {
        res.render(`admin/ecommerce/catalog/category/details`)
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const categoryAdd = async (req, res) => {
    try {
        res.render(`admin/ecommerce/catalog/category/add-form`)
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const categoryEdit = async (req, res) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        res.render(`admin/ecommerce/catalog/category/edit-form`, { category })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const categorySave = async (req, res) => {
    try {
        session = req.authUser
        let nameValidationObj = {}
        let descValidationObj = {}
        let imageValidationObj = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(nameValidationObj, {
                [lang.prefix]: eval(`Joi.string().required().min(3).max(60)`),
            })
            _.assign(imageValidationObj, {
                [lang.prefix]: eval(
                    `Joi.when('method',{is:Joi.string().valid('edit'),then:Joi.optional(),otherwise:Joi.string().required()})`
                ),
            })
            _.assign(descValidationObj, {
                [lang.prefix]: eval(`Joi.string().required().min(50)`),
            })
        })
        const schema = Joi.object({
            method: Joi.string().valid('add', 'edit'),
            position: Joi.number().required(),
            published: Joi.string().required().valid('true', 'false'),
            id: Joi.optional(),
            name: Joi.object({
                ...nameValidationObj,
            }),
            description: Joi.object({
                ...descValidationObj,
            }),
            image: Joi.when('method', {
                is: Joi.string().valid('add'),
                then: Joi.object({
                    en: Joi.string().required(),
                    ar: Joi.string().required(),
                }),
                otherwise: Joi.optional(),
            }),
            image_url: Joi.object({
                en: Joi.optional(),
                ar: Joi.optional(),
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

        let isEdit = false
        if (req.body.id) {
            isEdit = true
        }
        let body = req.body
        let brand = session.selected_brand

        // Media upload starts
        let images = {}
        if (req.files && req.files.length) {
            if (isEdit) {
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
            }
            for (i = 0; i < req.files.length; i++) {
                let file = req.files[i]
                // Creating base64 from file
                const base64 = Buffer.from(fs.readFileSync(file.path)).toString(
                    'base64'
                )
                let fieldLang = req.files[i].fieldname.split('.')[1]
                const media = await uploadMedia(
                    base64,
                    'Categories',
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
        // Media upload ends

        let customErrors = []
        if (isEdit) {
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
                            [lang.prefix]: JSON.parse(
                                body.image_url[lang.prefix]
                            ),
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
                            [lang.prefix]: JSON.parse(
                                body.image_url[lang.prefix]
                            ),
                        }
                    } else {
                        customErrors.push({
                            message: `image.${lang.prefix} is not allowed to be empty`,
                            path: [`image`, `${lang.prefix}`],
                        })
                    }
                })
            }
        }
        if (customErrors?.length) {
            return res.status(422).json({
                _original: req.body,
                details: customErrors,
            })
        }
        // Getting multi language data dynamically
        let name = {}
        let description = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(name, {
                [lang.prefix]: body.name?.[lang.prefix],
            })
        })
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(description, {
                [lang.prefix]: body.description?.[lang.prefix],
            })
        })
        // Data to insert
        let data = {
            name,
            description,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
            image: images,
            position: body.position,
            slug: slugify(body.name.en.toLowerCase()),
            published: body.published === 'true',
        }
        let save
        if (isEdit) {
            save = await Category.findOneAndUpdate(
                {
                    _id: req.body.id,
                    brand: req.authUser.selected_brand._id,
                    country: req.authUser.selected_brand.country,
                },
                data
            )
        } else {
            save = await Category.create(data)
        }

        // If not saved
        if (!save?._id) {
            return res.status(404).json({ error: 'Something went wrong' })
        }

        return res.status(201).json({
            message: `Category ${isEdit ? 'updated' : 'added'} successfully`,
        })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}
// Delete image
const deleteCategoryImage = async (req, res) => {
    try {
        const { id } = req.body
        const category = await Category.findOneAndUpdate(
            {
                _id: id,
                brand: req.authUser.selected_brand._id,
                country: req.authUser.selected_brand.country,
            },
            {
                $set: {
                    image: null,
                },
            }
        )
        if (!category?._id) {
            return res.status(404).json({ error: 'Category not updated' })
        }
        return res.status(200).json({ message: 'Category image deleted' })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

// PRODUCT SECTION STARTS

const products = async (req, res) => {
    try {
        session = req.authUser
        let brand = session.selected_brand
        const products = await Product.find({
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        }).sort('position')
        res.render(`admin/ecommerce/catalog/product/listing`, { products })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const productDetail = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        })
        res.render(`admin/ecommerce/catalog/product/details`, { product })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const productAdd = async (req, res) => {
    try {
        session = req.authUser
        let brand = session.selected_brand
        const categories = await Category.find({
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
            published: true,
        })

        const semnoxProducts =
            globalModuleConfig.has_semnox == 'true'
                ? await getProductPriceController(req.authUser.selected_brand)
                : []

        const pamMemberships = await getPamMemberships()

        res.render(`admin/ecommerce/catalog/product/form`, {
            categories,
            semnoxProducts: semnoxProducts?.data,
            pamMemberships: pamMemberships,
            ecommerceSettings: session?.selected_brand?.settings,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const productEdit = async (req, res) => {
    try {
        session = req.authUser
        let brand = session.selected_brand
        const product = await Product.findOne({ _id: req.params.id })
        const categories = await Category.find({
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
            published: true,
        })

        const semnoxProducts =
            globalModuleConfig.has_semnox == 'true'
                ? await getProductPriceController(req.authUser.selected_brand)
                : []

        const pamMemberships = await getPamMemberships()
        res.render(`admin/ecommerce/catalog/product/edit-form`, {
            product,
            categories,
            semnoxProducts: semnoxProducts?.data,
            pamMemberships: pamMemberships,
            ecommerceSettings: session?.selected_brand?.settings,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const productSave = async (req, res) => {
    // console.log('BODY:', req.body)
    try {
        session = req.authUser
        let nameValidationObj = {}
        let descValidationObj = {}
        let tAndCValidationObj = {}
        let membershipObj = {}
        req.authUser?.selected_brand?.languages.forEach((lang) => {
            _.assign(nameValidationObj, {
                [lang.prefix]: eval(`Joi.string().required().min(3).max(60)`),
            })
            _.assign(descValidationObj, {
                [lang.prefix]: eval(`Joi.string().required().min(10)`),
            })
            _.assign(tAndCValidationObj, {
                [lang.prefix]: eval(`Joi.string().allow("",null)`),
            })
        })
        const schema = Joi.object({
            name: Joi.object({
                ...nameValidationObj,
            }),
            description: Joi.object({
                ...descValidationObj,
            }),
            method: Joi.string().valid('add', 'edit'),
            product_type: Joi.string().allow(
                'regular',
                'free_product',
                'free_toy'
            ),
            terms_and_conditions: Joi.when('product_type', {
                is: Joi.string().valid('regular'),
                then: Joi.object({
                    ...tAndCValidationObj,
                }),
                otherwise: Joi.optional(),
            }),
            actual_price: Joi.when('product_type', {
                is: Joi.string().valid('regular'),
                then: Joi.number().required().min(1),
                otherwise: Joi.optional(),
            }),
            sales_price: Joi.when('product_type', {
                is: Joi.string().valid('regular'),
                then: Joi.number()
                    .optional()
                    .allow(null, '')
                    .max(Joi.ref('actual_price')),
                otherwise: Joi.optional(),
            }),
            published: Joi.string().required().valid('true', 'false'),
            category: Joi.when('product_type', {
                is: Joi.string().valid('regular'),
                then: Joi.array().items(Joi.string()).required().min(1),
                otherwise: Joi.optional(),
            }),
            is_membership: Joi.boolean().optional(),
            valid_pam_ids: Joi.array().optional(),
            // valid_pam_ids: Joi.when('is_membership', {
            //     is: Joi.boolean().valid(true),
            //     otherwise: Joi.optional(),
            //     then: Joi.array().items(Joi.string()).required().min(1),
            // }),
            default_image_url: Joi.object({
                en: Joi.optional(),
                ar: Joi.optional(),
            }),
            featured_image_url: Joi.object({
                en: Joi.optional(),
                ar: Joi.optional(),
            }),
            default_image: Joi.when('product_type', {
                is: Joi.string().valid('regular'),
                otherwise: Joi.optional(),
                then: Joi.when('method', {
                    is: Joi.string().valid('edit'),
                    then: Joi.optional(),
                    otherwise: Joi.object({
                        en: Joi.string().required(),
                        ar: Joi.string().required(),
                    }),
                }),
            }),
            featured_image: Joi.optional(),
            semnox_id:
                globalModuleConfig.has_semnox == 'true'
                    ? Joi.string().required().min(3)
                    : Joi.string().optional().allow(null, ''),
            position: Joi.number().required(),
            featured: Joi.boolean().optional(),
            id: Joi.optional(),
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
        let isEdit = false
        let body = req.body
        if (body.id) {
            isEdit = true
        }
        let brand = session.selected_brand
        const country = await Country.findOne({
            code: brand.country_code,
        })

        let images = {}

        if (req.files && req.files.length) {
            if (isEdit) {
                let customErrors = []
                req.authUser.selected_brand.languages.forEach((lang) => {
                    if (!body.default_image?.[lang.prefix]) {
                        if (!body.default_image_url?.[lang.prefix]) {
                            if (body.product_type == 'regular') {
                                customErrors.push({
                                    message: `default_image.${lang.prefix} is not allowed to be empty`,
                                    path: [`default_image`, `${lang.prefix}`],
                                })
                            }
                        }
                    }
                    if (!body.featured_image?.[lang.prefix]) {
                        if (body.featured_image_url?.[lang.prefix]) {
                            images['featured_image'] = {
                                ...images['featured_image'],
                                [lang.prefix]: JSON.parse(
                                    body?.featured_image_url?.[lang.prefix]
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
            }
            for (i = 0; i < req.files.length; i++) {
                let file = req.files[i]
                // Creating base64 from file
                const base64 = Buffer.from(fs.readFileSync(file.path)).toString(
                    'base64'
                )
                let fieldName = file.fieldname.split('.')[0]
                let fieldLang = file.fieldname.split('.')[1]
                const media = await uploadMedia(
                    base64,
                    'Products',
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
        if (isEdit) {
            // Image Edit
            if (Object.keys(images)?.length) {
                req.authUser.selected_brand.languages.forEach((lang) => {
                    if (images?.default_image?.[lang.prefix]?.media_url) {
                        images['default_image'] = {
                            ...images['default_image'],
                            [lang.prefix]: images?.default_image?.[lang.prefix],
                        }
                    } else if (body.default_image_url?.[lang.prefix]) {
                        images['default_image'] = {
                            ...images['default_image'],
                            [lang.prefix]: JSON.parse(
                                body?.default_image_url?.[lang.prefix]
                            ),
                        }
                    } else {
                        if (body.product_type == 'regular') {
                            customErrors.push({
                                message: `default_image.${lang.prefix} is not allowed to be empty`,
                                path: [`default_image`, `${lang.prefix}`],
                            })
                        }
                    }
                })
            } else {
                req.authUser.selected_brand.languages.forEach((lang) => {
                    if (body.default_image_url?.[lang.prefix]) {
                        images['default_image'] = {
                            ...images['default_image'],
                            [lang.prefix]: JSON.parse(
                                body?.default_image_url?.[lang.prefix]
                            ),
                        }
                    } else {
                        if (body.product_type == 'regular') {
                            customErrors.push({
                                message: `default_image.${lang.prefix} is not allowed to be empty`,
                                path: [`default_image`, `${lang.prefix}`],
                            })
                        }
                    }
                    if (body.featured_image_url?.[lang.prefix]) {
                        images['featured_image'] = {
                            ...images['featured_image'],
                            [lang.prefix]: JSON.parse(
                                body?.featured_image_url?.[lang.prefix]
                            ),
                        }
                    }
                })
            }
        }
        if (customErrors?.length) {
            return res.status(422).json({
                _original: req.body,
                details: customErrors,
            })
        }

        // Getting multi language data dynamically
        let name = {}
        let description = {}
        let terms_and_conditions = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(name, {
                [lang.prefix]: body.name?.[lang.prefix],
            })
            _.assign(description, {
                [lang.prefix]: body.description?.[lang.prefix],
            })
            _.assign(terms_and_conditions, {
                [lang.prefix]: body.terms_and_conditions?.[lang.prefix],
            })
        })
        // parsing stringified semnox data
        const semnox =
            globalModuleConfig.has_semnox == 'true'
                ? JSON.parse(body.semnox_id)
                : undefined
        let data = {
            name,
            slug: slugify(body.name.en.toLowerCase()),
            description,
            product_type: body.product_type,
            terms_and_conditions:
                body.product_type != 'regular' ? null : terms_and_conditions,
            actual_price:
                body.product_type != 'regular'
                    ? null
                    : parseFloat(body.actual_price),
            sales_price:
                body.product_type != 'regular'
                    ? null
                    : parseFloat(body.sales_price || 0),
            category: body.product_type == 'free_toy' ? null : body.category,
            membership: {
                is_membership: body.is_membership,
                valid_pam_ids: body.valid_pam_ids,
            },
            author: session.admin_id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
            semnox: semnox,
            published: body.published === 'true',
            position: body.position,
            image: images,
            featured: body.featured || false,
        }

        let save
        if (isEdit) {
            // Update product
            save = await Product.findOneAndUpdate({ _id: body.id }, data)
        } else {
            // Create product
            save = await Product.create(data)
        }

        if (!save?._id) {
            return res.status(400).json({ error: 'Something went wrong' })
        }
        return res.status(200).json({
            message: `Product ${isEdit ? 'updated' : 'added'}  successfully`,
            product: save,
        })
    } catch (error) {
        console.log(error)
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

// COMMON FUNCTIONS
const deleteItem = async (req, res) => {
    try {
        const { id, item } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Id not found' })
        }

        // delete item
        if (item === '1') {
            await Category.softDelete({
                _id: id,
                brand: req.authUser.selected_brand._id,
                country: req.authUser.selected_brand.country,
            })
        } else if (item === '2') {
            await Product.softDelete({
                _id: id,
                brand: req.authUser.selected_brand._id,
                country: req.authUser.selected_brand.country,
            })
        }

        return res.status(200).json({
            message: `${catalogItems[item]} Deleted`,
        })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

const changeStatus = async (req, res) => {
    try {
        const { status, id, item } = req.body
        // If id not found
        if (!id) {
            return res.status(404).json({ error: 'Invalid data' })
        }

        let update
        // Upadte status field
        if (item === '1') {
            update = await Category.findOneAndUpdate(
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
        } else if (item === '2') {
            update = await Product.findOneAndUpdate(
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
        }
        // If not updated
        if (!update?._id) {
            return res.status(404).json({ error: 'Something went wrong' })
        }
        return res.status(200).json({
            message: `${catalogItems[item]} status changed`,
        })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

module.exports = {
    categories,
    categoryDetail,
    categoryAdd,
    categoryEdit,
    categorySave,
    deleteCategoryImage,
    products,
    productDetail,
    productAdd,
    productEdit,
    productSave,
    deleteItem,
    changeStatus,
}
