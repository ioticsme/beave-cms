require('dotenv').config()
const fs = require('fs')
const Product = require('../../model/Product')
const Coupon = require('../../model/Coupon')
const { formatInTimeZone } = require('date-fns-tz')
const Joi = require('joi')
var randomstring = require('randomstring')
const collect = require('collect.js')
let session = require('express-session')
const excelJS = require('exceljs')

const list = async (req, res) => {
    try {
        session = req.authUser
        const coupons = await Coupon.find({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        res.render(`admin/ecommerce/coupons/list`, { coupons })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const add = async (req, res) => {
    try {
        let isBulk = false
        session = req.authUser
        if (req?.query?.bulk == 'true') {
            isBulk = true
        }
        const freeProducts = await Product.find({
            brand: req.authUser.selected_brand,
            country: req.authUser.selected_brand.country,
            product_type: 'free_product',
        })
        const allProducts = await Product.find({
            brand: req.authUser.selected_brand,
            country: req.authUser.selected_brand.country,
            product_type: 'regular',
        })
        res.render(`admin/ecommerce/coupons/add`, {
            isBulk,
            freeProducts,
            allProducts,
            brand: session.selected_brand,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const edit = async (req, res) => {
    try {
        session = req.authUser
        const coupon = await Coupon.findOne({
            _id: req.params.id,
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        // return res.json(coupon)
        let isBulk = false
        const freeProducts = await Product.find({
            brand: req.authUser.selected_brand,
            country: req.authUser.selected_brand.country,
            product_type: 'free_product',
        })
        const allProducts = await Product.find({
            brand: req.authUser.selected_brand,
            country: req.authUser.selected_brand.country,
            product_type: 'regular',
        })
        if (coupon?.is_group) {
            isBulk = true
        }
        res.render(`admin/ecommerce/coupons/edit`, {
            coupon,
            freeProducts,
            allProducts,
            isBulk,
            brand: session.selected_brand,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const couponSave = async (req, res) => {
    try {
        session = req.authUser
        const schema = Joi.object({
            is_bulk: Joi.optional(),
            name: Joi.string().required().min(3).max(60),
            quantity: Joi.when('is_bulk', {
                is: Joi.string().valid('true'),
                then: Joi.number().required().min(1),
                otherwise: Joi.optional(),
            }),
            code: Joi.when('is_bulk', {
                is: Joi.string().valid('false'),
                then: Joi.string().required(),
                otherwise: Joi.optional(),
            }),
            // code: Joi.string().required().min(4).max(8),
            coupon_type: Joi.string().valid(
                'percentage',
                'fixed',
                'bogo',
                'free'
            ),
            user_type: Joi.string().valid('all', 'new'),
            discount_value: Joi.number().required(),
            minimum_order: Joi.number(),
            minimum_order_per_card: Joi.number(),
            maximum_discount: Joi.number(),
            expiry: Joi.string().required(),
            start_date: Joi.date().required(),
            end_date: Joi.when('expiry', {
                is: Joi.string().valid('yes'),
                then: Joi.date().required().min(Joi.ref('start_date')),
                otherwise: Joi.optional(),
            }),
            user_level_limit: Joi.number().required(),
            no_of_uses_total: Joi.number().required(),
            pro_type: Joi.optional(),
            free_product: Joi.when('coupon_type', {
                is: Joi.string().valid('free'),
                then: Joi.string().required(),
                otherwise: Joi.optional(),
            }),
            products: Joi.when('pro_type', {
                is: Joi.string().valid('some'),
                then: Joi.array().items(Joi.string()).required().min(1),
                otherwise: Joi.array(),
            }),
            id: Joi.optional(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            res.status(422).json(validationResult.error)
            return
        }

        let isEdit = false
        let isBulk = false
        let body = req.body

        if (body.id) {
            isEdit = true
        }
        if (body?.is_bulk == 'true') {
            isBulk = true
        }
        // Parsing stringified semnox products to JSON
        // let newProducts = []
        // if (body.pro_type == 'some') {
        //     if (body.products?.length) {
        //         body.products.forEach((pro) => {
        //             newProducts.push(JSON.parse(pro))
        //         })
        //     }
        // }
        // data to insert
        let data = {
            name: body.name,
            // code: body.code,
            coupon_type: body.coupon_type,
            user_type: body.user_type,
            discount_value:
                body.coupon_type === 'bogo'
                    ? null
                    : body.coupon_type === 'free'
                    ? null
                    : body.discount_value,
            minimum_order:
                body.coupon_type === 'free' ? null : body.minimum_order,
            minimum_order_per_card:
                body.coupon_type === 'free'
                    ? body.minimum_order_per_card
                    : null,
            maximum_discount:
                body.coupon_type === 'fixed'
                    ? null
                    : body.coupon_type === 'bogo'
                    ? null
                    : body.coupon_type === 'free'
                    ? null
                    : body.maximum_discount,
            expiry: req.body.expiry === 'yes',
            start_date: body.start_date,
            end_date: body.expiry === 'yes' ? body.end_date : null,
            user_level_limit: body.user_level_limit || 0,
            no_of_uses_total: body.no_of_uses_total,
            free_product:
                body.coupon_type === 'free' ? body.free_product : null,
            products:
                body.pro_type === 'some' && body.products.length
                    ? body.products
                    : [],
            author: session.admin_id,
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        }

        // Fetching all coupons from DB
        const coupons = await Coupon.find({
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })

        let dataToInsert = {
            ...data,
            code: [],
            published: true,
        }

        let save
        // If adding bulk coupons
        if (isBulk) {
            dataToInsert.is_group = true
            // Function to generate coupon code
            const generateCode = () => {
                // Generate code
                let code = randomstring
                    .generate({
                        length: 8,
                        charset: 'alphabetic',
                        capitalization: 'uppercase',
                    })
                    .toUpperCase()

                // Checking generated code is exist in DB
                const checkDbExist = (cpn) => {
                    let check = cpn.code.some((cpnCode) => cpnCode.code == code)
                    return check
                }
                let isDBExist = coupons.some(checkDbExist)

                // Checking generated code is exist in Data to insert
                let isExist = dataToInsert.code.some((cpn) => cpn.code == code)

                if (isDBExist) {
                    generateCode()
                } else if (isExist) {
                    generateCode()
                } else {
                    return code
                }
            }

            for (i = 1; i <= Number(body.quantity); i++) {
                let code = await generateCode()
                dataToInsert.code.push({
                    code: code,
                })
            }
            if (isEdit) {
                // Update coupon
                const coupon = await Coupon.findOne({ _id: body.id })
                data.code = coupon?.code
                save = await Coupon.findOneAndUpdate({ _id: body.id }, data)
            } else {
                // Insert data to DB
                save = await Coupon.create(dataToInsert)
            }
        } else {
            // If coupon is adding normally
            dataToInsert.is_group = false
            data.code = { code: body.code.toUpperCase() }
            if (isEdit) {
                // Update coupon
                save = await Coupon.findOneAndUpdate({ _id: body.id }, data)
            } else {
                // Create coupon
                save = await Coupon.create(data)
            }
        }
        if (!save?._id) {
            return res.status(400).json({ error: 'Something went wrong' })
        }
        return res.status(200).json({
            message: `Coupon ${isEdit ? 'updated' : 'added'}  successfully`,
        })
    } catch (error) {
        console.log(error)
        return res.status(400).json({ error: 'Something went wrong' })
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
        await Coupon.softDelete({ _id: id })
        return res.status(200).json({
            message: `Coupon Deleted`,
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

        // Upadte status field
        const update = await Coupon.findOneAndUpdate(
            { _id: id },
            {
                $set: {
                    published: !status,
                },
            }
        )
        // If not updated
        if (!update?._id) {
            return res.status(404).json({ error: 'Coupon not found' })
        }
        return res.status(200).json({
            message: `Coupon status changed`,
        })
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

const exportToExcel = async (req, res) => {
    const coupon = await Coupon.findOne({ _id: req.params.id })
        .populate('author')
        .populate('brand')
        .populate('country')
    const workbook = new excelJS.Workbook() // Create a new workbook
    const detailWorkSheet = workbook.addWorksheet('Coupon Details') // New Worksheet
    const couponsWorkSheet = workbook.addWorksheet('Coupon List') // New Worksheet

    // Column for data in excel. key must match data key
    detailWorkSheet.columns = [
        { header: 'Key', key: 'key', width: 30 },
        { header: 'Value', key: 'value', width: 30 },
    ]

    // Column for data in excel. key must match data key
    couponsWorkSheet.columns = [
        { header: 'S no.', key: 's_no', width: 10 },
        { header: 'Code', key: 'code', width: 30 },
        { header: 'Usage', key: 'usage', width: 20 },
    ]

    detailWorkSheet.addRows([
        {
            key: 'Name',
            value: coupon.name,
        },
        {
            key: 'Number Of Coupons',
            value: coupon.code.length,
        },
        {
            key: 'Coupon Type',
            value: coupon.coupon_type,
        },
        {
            key: 'User Type',
            value: coupon.user_type,
        },
        {
            key: 'User Level Limit',
            value: coupon.user_level_limit,
        },
        {
            key: 'Bulk',
            value: coupon.is_group ? 'Yes' : 'No',
        },
        {
            key: 'Number Of Total uses',
            value: coupon.no_of_uses_total,
        },
        {
            key: 'Total Used',
            value: coupon.total_usage_count,
        },
        {
            key: 'Discount Value',
            value: coupon.discount_value,
        },
        {
            key: 'Minimum Order',
            value: coupon.minimum_order,
        },
        {
            key: 'Maximum Discount',
            value: coupon.maximum_discount || 'Unlimited',
        },
        {
            key: 'Start Date',
            value: coupon.start_date,
        },
        {
            key: 'End Date',
            value: coupon.end_date || 'No Expiry',
        },
        {
            key: 'Author',
            value: coupon.author?.name,
        },
        {
            key: 'Brand',
            value: coupon.brand?.name,
        },
        {
            key: 'Country',
            value: coupon.country?.name?.en,
        },
        {
            key: 'Published',
            value: coupon.published ? 'Yes' : 'No',
        },
        {
            key: 'Created At',
            value: coupon.created_at,
        },
    ]) // Add data in worksheet

    // Looping through Coupons
    let counter = 1
    coupon.code.forEach((eachCode) => {
        couponsWorkSheet.addRow({
            s_no: counter,
            code: eachCode.code,
            usage: eachCode.usage_count,
        }) // Add data in worksheet
        counter++
    })
    // Making first line in excel bold
    detailWorkSheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true }
    })
    couponsWorkSheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true }
    })

    try {
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' +
                `Coupon Code - ${coupon.name} - ${Date.now()}.xlsx`
        )
        await workbook.xlsx.write(res).then((data) => {
            res.end()
        })
    } catch (error) {
        return res.render(`admin/error-500`)
    }
}

module.exports = {
    list,
    couponSave,
    add,
    edit,
    deleteItem,
    changeStatus,
    exportToExcel,
}
