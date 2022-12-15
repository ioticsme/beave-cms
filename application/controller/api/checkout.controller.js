require('dotenv').config()
const collect = require('collect.js')
const Sentry = require('@sentry/node')
const { format, subMinutes, parseISO } = require('date-fns')
const { formatInTimeZone } = require('date-fns-tz')
const Joi = require('joi')
const Mailgun = require('mailgun.js')
const formData = require('form-data')
const Cart = require('../../model/Cart')
const Config = require('../../model/Config')
const Order = require('../../model/Order')
const Coupon = require('../../model/Coupon')
const User = require('../../model/User')
const UserCard = require('../../model/UserCard')
const OrderResource = require('../../resources/api/order.resource')
const PayFort = require('../../helper/Payfort.helper')
const Semnox = require('../../helper/Semnox.helper')
const PAM = require('../../helper/PAM.helper')
const Product = require('../../model/Product')
const { json } = require('express')
const {
    purchaseNotification,
    getRequestIp,
    fileLogger,
    getVatAmount,
} = require('../../helper/Operations.helper')
const PayfortWebHookLog = require('../../model/PayfortWebHookLog')
const Settings = require('../../model/Settings')
const TransactionLog = require('../../model/TransactionLog')
const { removeCache } = require('../../helper/Redis.helper')
const { orderNotification } = require('../../helper/Slack.helper')
// const AppLog = require('../../model/AppLog')

const freeToyCalculation = async (req, totalAmount) => {
    let free_toy
    if (req.brand.settings?.semnox_free_toy_available) {
        const freeToyEligibilityAmount =
            req.brand.settings?.semnox_free_toy_threshold

        free_toy = {
            eligible: totalAmount >= freeToyEligibilityAmount,
            qty: Math.floor(totalAmount / freeToyEligibilityAmount) || 0,
        }
        if (free_toy.eligible) {
            free_toy.item = await Product.findOne({
                brand: req.brand._id,
                country: req.country._id,
                product_type: 'free_toy',
                published: true,
                isDeleted: false,
            }).select('name semnox')
        }
    }

    return free_toy
}

const removeSavedCreditCard = async (
    user_id,
    merchant_reference,
    removeFromPayfort
) => {
    const user_cards = await User.findOne({
        _id: user_id,
        'payment_cards.merchant_reference': merchant_reference,
    })

    if (user_cards.payment_cards?.length) {
        const card_to_remove = collect(user_cards.payment_cards)
            .where('merchant_reference', merchant_reference)
            .first()
        if (card_to_remove._id) {
            if (removeFromPayfort) {
                PayFort.removeSavedToken(card_to_remove.token_name)
            }
            await User.findOneAndUpdate(
                {
                    _id: user_id,
                },
                {
                    $pull: {
                        payment_cards: {
                            // merchant_reference: merchant_reference,
                            saved: false,
                        },
                    },
                }
            )
        }
    }
}

const checkoutProcess = async (req, res) => {
    // const schema = Joi.object({
    //     order_id: Joi.string().optional().hex().length(24),
    // })

    // const validationResult = schema.validate(req.body, { abortEarly: false })

    // if (validationResult.error) {
    //     return res.status(422).json({
    // details: validationResult.error.details
    // })
    // }
    try {
        deleteOldPendingCheckouts(req.authPublicUser._id)

        const available_cart_items = await Cart.find({
            user: req.authPublicUser._id,
        })
            .populate(
                'product',
                '-__v -description -terms_and_conditions -category -image -isDeleted -deletedAt -created_at -updated_at'
            )
            .populate('card', 'card_name card_number')
            .select(' -created_at -updated_at -isDeleted -deletedAt -__v')

        if (!available_cart_items?.length) {
            return res.status(204).json('No cart Items.')
        }

        // console.log('C:', available_cart_items)

        let hasPam = false

        let itemsToInsert = collect(available_cart_items).map((cartitem) => {
            if (cartitem.pam?.membership_no) hasPam = true
            return {
                product_id: cartitem.product._id,
                name: cartitem.product.name,
                semnox: cartitem.product.semnox,
                actual_price: cartitem.product.actual_price,
                sales_price: cartitem.product.sales_price,
                new_card: cartitem.card ? false : true,
                transaction_type: cartitem.card ? 'recharge' : 'new',
                // card_name: cartitem.card_name,
                card: {
                    // _id: cartitem.card?._id,
                    card_name: cartitem.card
                        ? cartitem.card.card_name
                        : cartitem.card_name,
                    card_number: cartitem.card?.card_number,
                },
                qty: cartitem.qty,
                pam: cartitem.pam,
            }
        })

        // Checking minimum cart value
        const totalCartSum = available_cart_items.reduce((lastRes, item) => {
            return (
                lastRes +
                item.qty *
                    (item.product.sales_price > 0
                        ? item.product.sales_price
                        : item.product.actual_price)
            )
        }, 0)

        const free_toy = await freeToyCalculation(req, totalCartSum)

        let order
        const brandCode = req.brand?.code.toUpperCase()
        const countryCode = req.country?.code.toUpperCase()
        const apiSource = req.source

        const inclusiveVat = await getVatAmount(totalCartSum, req.brand)

        const pending_order = await Order.findOne(
            {
                user: req.authPublicUser._id,
                brand: req.brand,
                country: req.country,
                payment_status: 'pending',
                order_status: 'pending',
                created_at: {
                    $gt: subMinutes(new Date(), process.env.CART_EXPIRY || 60),
                },
                isDeleted: false,
            },
            { sort: { created_at: -1 } }
        ).populate('country')

        // console.log(pending_order)

        const ip = await getRequestIp(req)

        if (!pending_order) {
            const { order_no } = await Config.findOneAndUpdate(
                {},
                { $inc: { order_no: 1 } }
            )

            const newOrderNo = `${
                apiSource == 'app' ? 'M' : 'W'
            }-${brandCode}-${countryCode}-${String(order_no + 1).padStart(
                3,
                0
            )}`

            const data = {
                order_no: newOrderNo,
                user: req.authPublicUser._id,
                semnox_status: 'pending',
                payment_status: 'pending',
                order_status: 'pending',
                payment_method: 'online',
                items: [...itemsToInsert],
                has_free_toy: free_toy?.eligible || false,
                free_toy_qty: free_toy?.qty || 0,
                free_toy: free_toy?.item || undefined,
                brand: req.brand,
                country: req.country,
                amount: parseFloat(totalCartSum),
                ip: ip,
                amount_to_pay: parseFloat(totalCartSum),
                vat: {
                    percentage: parseFloat(
                        req.brand.settings?.ecommerce_settings?.vat_percentage
                    ),
                    incl: parseFloat(inclusiveVat),
                },
            }
            if (hasPam) data.pam_status = 'pending'
            // Creating order with cart items
            order = await Order.create(data)
        } else {
            // order = await Order.findOne({ _id: req.body.order_id }).populate(
            //     'country'
            // )
            // if (!order?._id) {
            //     return res.status(404).json('order not found')
            // }
            pending_order.items = [...itemsToInsert]
            pending_order.has_free_toy = free_toy?.eligible || false
            pending_order.free_toy_qty = free_toy?.qty || 0
            pending_order.free_toy = free_toy?.item || undefined
            pending_order.discount = {
                amount: 0,
                code: undefined,
            }
            pending_order.amount = parseFloat(totalCartSum)
            pending_order.amount_to_pay = parseFloat(totalCartSum)
            pending_order.vat.percentage = parseFloat(
                req.brand.settings?.ecommerce_settings?.vat_percentage
            )
            pending_order.vat.incl = parseFloat(inclusiveVat)
            pending_order.ip = ip

            pending_order.pam_status = hasPam ? 'pending' : undefined

            order = await pending_order.save()
        }

        if (!order?._id) {
            return res.status(400).json({ error: `Bad Request` })
        }
        // update order init number
        // console.log('Order created', order)
        return res.status(200).json(new OrderResource(order).exec())
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const applyCoupon = async (req, res) => {
    const schema = Joi.object({
        code: Joi.string().required().min(2).max(10),
        order_id: Joi.string().required().hex().length(24),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    try {
        const user = await User.findOne({
            _id: req.authPublicUser._id,
        })

        if (!user) {
            return res.status(404).json('User Not Found')
        }

        const zoneTimeNow = formatInTimeZone(
            new Date(),
            req.country.timezone,
            'yyyy-MM-dd HH:mm:ss'
        )

        const coupon = await Coupon.findOne({
            code: {
                $elemMatch: {
                    code: req.body.code.toUpperCase(),
                },
            },
            start_date: { $lte: zoneTimeNow },
            $or: [{ end_date: null }, { end_date: { $gte: zoneTimeNow } }],
            $or: [
                { no_of_uses_total: 0 },
                { $expr: { $gt: ['$no_of_uses_total', '$total_usage_count'] } },
            ],
            // $expr: { $gt: ['$no_of_uses_total', '$total_usage_count'] },
            // expiry: false,
            brand: req.brand._id,
            published: true,
            isDeleted: false,
            country: req.country._id,
        })
            .populate('free_product', '_id name semnox')
            .populate('products', '_id name semnox')

        if (!coupon) {
            return res.status(404).json({ error: 'Invalid Coupon' })
        }

        const order = await Order.findOne({
            _id: req.body.order_id,
            user: user._id,
            brand: req.brand,
            country: req.country,
            order_status: 'pending',
            isDeleted: false,
        }) //TODO::Add condition to pull published product item only
            .populate('country')
            .select('-__v -updated_at -created_at -deletedAt -isDeleted')

        if (order.discount?.applied_coupon) {
            return res
                .status(400)
                .json({ error: 'Coupon is already applied for this order' })
        }

        if (!order?.items?.length) {
            return res.status(400).json({ error: 'Your cart is empty' })
        }

        // If the New User segmentation: check the auth user has done any order in history
        if (coupon.user_type == 'new' && !user.new_user) {
            return res.status(422).json({
                details: [
                    {
                        message: 'This coupon is valid only for new users!',
                        path: ['code'],
                        type: 'any.invalid',
                        context: {
                            label: 'code',
                            key: 'code',
                        },
                    },
                ],
            })
        }

        // If the User Limit segemntation: compare the auth user order count by using same coupon
        if (coupon.user_level_limit > 0) {
            const user_orders = await Order.find({
                user: req.authPublicUser._id,
                brand: req.brand,
                country: req.country,
                order_status: 'success',
                'discount.coupon._id': coupon._id, // TODO: Should Restructure
            })
            // return res.json(user_orders)
            if (user_orders.length >= coupon.user_level_limit) {
                return res.status(422).json({
                    details: [
                        {
                            message: '"code" usage limit exceed',
                            path: ['code'],
                            type: 'any.invalid',
                            context: {
                                label: 'code',
                                key: 'code',
                            },
                        },
                    ],
                })
            }
        }

        // Checking minimum cart value
        const totalCartSum = order.items.reduce((lastRes, item) => {
            return (
                lastRes +
                item.qty *
                    (item.sales_price > 0
                        ? item.sales_price
                        : item.actual_price)
            )
        }, 0)

        if (totalCartSum < coupon.minimum_order) {
            return res.status(422).json({
                details: [
                    {
                        message: `Minimum order value to apply coupon code is ${coupon.minimum_order}`,
                        path: ['code'],
                        type: 'any.invalid',
                        context: {
                            label: 'code',
                            key: 'code',
                        },
                    },
                ],
            })
        }

        // console.log(collect(order.items).pluck('id').toArray())
        // console.log(collect(coupon.products).pluck('id').toArray())
        // If the Some Products Segmentation: check the user added atleast one item from this list to cart and apply discount only for that
        let applicable_cart_products = []
        if (coupon.products?.length) {
            applicable_cart_products = order.items.map((item) => {
                const itemFound = collect(coupon.products)
                    .where('id', item.product_id.toString())
                    .first()
                if (itemFound) {
                    return itemFound['id']
                }
            })
            if (!applicable_cart_products.length) {
                return res.status(422).json({
                    details: [
                        {
                            message:
                                'This coupon is applicable only for selected products',
                            path: ['code'],
                            type: 'any.invalid',
                            context: {
                                label: 'code',
                                key: 'code',
                            },
                        },
                    ],
                })
            }
        }

        /*==== Steps to reproduce=============
    3) If the Some Products Segmentation: check the user added atleast one item from this list to cart and apply discount only for that
    4) Return valid output (fixed / percentage / bogo / free product) value
    */
        order.discount.applied_coupon = req.body.code
        order.discount.coupon = coupon
        let bogo_items
        if (
            coupon.coupon_type == 'percentage' ||
            coupon.coupon_type == 'fixed'
        ) {
            const discountAmount =
                coupon.coupon_type == 'percentage'
                    ? (totalCartSum * coupon.discount_value) / 100
                    : coupon.discount_value

            const amount_to_pay = parseFloat(totalCartSum - discountAmount)

            const inclusiveVat = await getVatAmount(amount_to_pay, req.brand)

            const free_toy = await freeToyCalculation(req, amount_to_pay)

            order.discount.amount = parseFloat(discountAmount)

            order.amount_to_pay = parseFloat(amount_to_pay)
            order.has_free_toy = free_toy?.eligible || false
            order.free_toy_qty = free_toy?.qty || 0
            order.free_toy = free_toy?.item || undefined
            order.vat.incl = parseFloat(inclusiveVat)
        } else if (coupon.coupon_type == 'free') {
            order.items[0].has_free_product = true
            order.items[0].free_product = coupon.free_product
        } else if (coupon.coupon_type == 'bogo') {
            if (applicable_cart_products.length) {
                console.log(applicable_cart_products)
                bogo_items = await collect(order.items)
                    .where('is_bogo_item', false)
                    .toArray()
                    .map((item) => {
                        if (
                            applicable_cart_products.includes(
                                item.product_id.toString()
                            )
                        ) {
                            return {
                                ...item._doc,
                                _id: undefined,
                                is_bogo_item: true,
                            }
                        }
                    })
            } else {
                bogo_items = await collect(order.items)
                    .where('is_bogo_item', false)
                    .toArray()
                    .map((item) => {
                        return {
                            ...item._doc,
                            _id: undefined,
                            is_bogo_item: true,
                        }
                    })
            }
        }

        coupon.total_usage_count = coupon.total_usage_count + 1
        await coupon.save()

        await order.save()
        if (bogo_items.length) {
            await Order.updateOne(
                { _id: order._id },
                { $push: { items: { $each: bogo_items } } }
            )
        }
        const updated_order = await Order.findOne({
            _id: order._id,
        })
        res.status(200).json(new OrderResource(updated_order).exec())
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const removeAppliedCoupon = async (req, res) => {
    const schema = Joi.object({
        // code: Joi.string().required().min(2).max(10),
        order_id: Joi.string().required().hex().length(24),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    try {
        const reqOrder = await Order.findOne({
            _id: req.body.order_id,
            user: req.authPublicUser._id,
            brand: req.brand,
            country: req.country,
            order_status: 'pending',
            isDeleted: false,
        })

        if (!reqOrder) {
            return res.status(404).json('Order not found')
        }

        const removing_code = reqOrder.discount?.applied_coupon || false

        const available_cart_items = await Cart.find({
            user: req.authPublicUser._id,
        })
            .populate(
                'product',
                '-__v -description -terms_and_conditions -category -image -isDeleted -deletedAt -created_at -updated_at'
            )
            .populate('card', 'card_name card_number')
            .select(' -created_at -updated_at -isDeleted -deletedAt -__v')

        if (!available_cart_items?.length) {
            return res.status(204).json('No cart Items.')
        }

        // Checking minimum cart value
        const totalCartSum = available_cart_items.reduce((lastRes, item) => {
            return (
                lastRes +
                item.qty *
                    (item.product.sales_price > 0
                        ? item.product.sales_price
                        : item.product.actual_price)
            )
        }, 0)

        const free_toy = await freeToyCalculation(req, totalCartSum)
        let order
        const inclusiveVat = await getVatAmount(totalCartSum, req.brand)

        reqOrder.has_free_toy = free_toy?.eligible || false
        reqOrder.free_toy_qty = free_toy?.qty || 0
        reqOrder.free_toy = free_toy?.item || undefined
        reqOrder.discount = {
            amount: 0,
            code: undefined,
        }
        reqOrder.amount = parseFloat(totalCartSum)
        reqOrder.amount_to_pay = parseFloat(totalCartSum)
        reqOrder.vat.percentage = parseFloat(
            req.brand.settings?.ecommerce_settings?.vat_percentage
        )
        reqOrder.vat.incl = parseFloat(inclusiveVat)

        reqOrder.items.pull
        await reqOrder.save()

        await Order.updateOne(
            { _id: reqOrder._id },
            { $pull: { items: { is_bogo_item: true } } }
        )

        await Coupon.updateOne(
            {
                code: {
                    $elemMatch: {
                        code: removing_code,
                    },
                },
                brand: req.brand._id,
                published: true,
                isDeleted: false,
                country: req.country._id,
            },
            { $inc: { total_usage_count: -1 } }
        )

        const updated_order = await Order.findOne({
            _id: reqOrder._id,
        })

        return res.status(200).json(new OrderResource(updated_order).exec())
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const paymentAuth = async (req, res) => {
    try {
        deleteOldPendingCheckouts(req.authPublicUser._id)

        const latest_pending_order = await Order.findOne(
            {
                user: req.authPublicUser._id,
                brand: req.brand,
                country: req.country,
                payment_status: 'pending',
                order_status: 'pending',
                created_at: {
                    $gt: subMinutes(new Date(), process.env.CART_EXPIRY || 60),
                },
                isDeleted: false,
            },
            {},
            { sort: { created_at: -1 } }
        )

        // console.log(process.env.CART_EXPIRY)

        if (!latest_pending_order) {
            return res
                .status(404)
                .json('No order found to proceed with payment')
        }

        latest_pending_order.merchant_ref_v = Date.now()

        let auth_response

        if (req.body.token_name && req.body.card_security_code) {
            auth_response = PayFort.getMerchantPageDataSavedCard(
                `${latest_pending_order.order_no}`, //TODO:: random value should be removed
                latest_pending_order.merchant_ref_v,
                req.body.token_name,
                req.body.card_security_code,
                req.headers.locale,
                req.brand.settings
            )
        } else {
            auth_response = PayFort.getMerchantPageData(
                `${latest_pending_order.order_no}`, //TODO:: random value should be removed
                latest_pending_order.merchant_ref_v,
                req.headers.locale,
                req.brand.settings
            )
        }

        latest_pending_order.save()

        return res.json(auth_response)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Payment Initializtion Error..!' })
    }
}

// const paymentProcessOld = async (req, res) => {
//     const schema = Joi.object({
//         // order_id: Joi.string().required().hex().length(24),
//         save_card: Joi.boolean().optional().allow(null, ''),
//         payfort_object: Joi.object({
//             // orderNumber: Joi.string().optional().allow(null, ''),
//             token_name: Joi.string().required(),
//             merchant_reference: Joi.string().required(),
//             response_code: Joi.string().required(),
//             signature: Joi.string().required(),
//             response_message: Joi.string().required(),
//             access_code: Joi.string().allow('').optional(),
//             token_name: Joi.string().required().min(10),
//             card_bin: Joi.string().allow('').optional(),
//             card_holder_name: Joi.string().allow('').optional(),
//             card_number: Joi.string().allow('').optional(),
//             card_security_code: Joi.string().allow('').optional(),
//             expiry_date: Joi.string().allow('').optional(),
//             language: Joi.string().allow('').optional(),
//             merchant_identifier: Joi.string().allow('').optional(),
//             return_url: Joi.string().allow('').optional(),
//             service_command: Joi.string().allow('').optional(),
//             status: Joi.string().allow('').optional(),
//         }).required(),
//     })

//     const validationResult = schema.validate(req.body, { abortEarly: false })

//     if (validationResult.error) {
//         return res.status(422).json({
//             details: validationResult.error.details,
//         })
//     }

//     /* ================ Sample payment response that will submit from front-end app =====================
//     {
//         access_code: "OZ5Cuu6qLjE3CwpByuJG";
//         card_bin: "512345";
//         card_holder_name: "**";
//         card_number: "******";
//         expiry_date: "**";
//         language: "en";
//         merchant_identifier: "PAFGHYMV";
//         merchant_reference: "ABC123";
//         response_code: "18000";
//         response_message: "Success";
//         return_url: "http://localhost:3000/en-ae/order/payment";
//         service_command: "TOKENIZATION";
//         signature: "8c954183f391ff11709bd5b54cc98c6ac463ec80a1c1455273820836c3a37324";
//         status: "18";
//         token_name: "a673d54ae2c2451ba4de4855278e5960";
//     }

//     1) Validate the payfort object
//     2) Match the signature:
//         a) signature value should be moved to another variable and remove from payfor_object
//         b) remove integration_type and 3ds from payfort_object if its there.
//     3) If card save options is on: save token_name, card_bin, expiry_date, card_no to local db
//     */

//     try {
//         if (req.body.save_card) {
//             await User.updateOne(
//                 { _id: req.authPublicUser._id },
//                 {
//                     $push: {
//                         payment_cards: [req.body.payfort_object],
//                     },
//                 }
//             )
//         }

//         const order_no_arr =
//             req.body.payfort_object.merchant_reference.split('-')

//         const order = await Order.findOne(
//             {
//                 order_no: `${order_no_arr[0]}-${order_no_arr[1]}-${order_no_arr[2]}-${order_no_arr[3]}`,
//                 payment_status: 'pending',
//                 order_status: 'pending',
//             },
//             {},
//             { sort: { created_at: -1 } }
//         )
//             .populate('country')
//             .populate('user')

//         // console.log(order.user)
//         if (!order) {
//             return res.status(404).json('Invalid Order')
//         }
//         const payment_process = await PayFort.processMerchantPageResponse(
//             req.body.payfort_object,
//             order.amount_to_pay,
//             order.country.currency,
//             order.user
//         )

//         if (payment_process) {
//             order.payment_response = payment_process.params
//             await order.save()
//         }

//         // console.log(payment_process)

//         return res.json(payment_process)
//     } catch (e) {
//         return res.status(500).json({ error: `Something went wrong` })
//     }
// }

const paymentProcess = async (req, res) => {
    const schema = Joi.object({
        // order_id: Joi.string().required().hex().length(24),
        // save_card: Joi.boolean().optional().allow(null, ''),
        payfort_object: Joi.object({
            // orderNumber: Joi.string().optional().allow(null, ''),
            token_name: Joi.string().required(),
            merchant_reference: Joi.string().required(),
            response_code: Joi.string().required(),
            signature: Joi.string().required(),
            response_message: Joi.string().required(),
            access_code: Joi.string().allow('').optional(),
            token_name: Joi.string().required().min(10),
            card_bin: Joi.string().allow('').optional(),
            card_holder_name: Joi.string().allow('').optional(),
            card_number: Joi.string().allow('').optional(),
            card_security_code: Joi.string().allow('').optional(),
            expiry_date: Joi.string().allow('').optional(),
            language: Joi.string().allow('').optional(),
            merchant_identifier: Joi.string().allow('').optional(),
            return_url: Joi.string().allow('').optional(),
            service_command: Joi.string().allow('').optional(),
            status: Joi.string().allow('').optional(),
        }).required(),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    /* ================ Sample payment response that will submit from front-end app =====================
    {
        access_code: "OZ5Cuu6qLjE3CwpByuJG";
        card_bin: "512345";
        card_holder_name: "**";
        card_number: "******";
        expiry_date: "**";
        language: "en";
        merchant_identifier: "PAFGHYMV";
        merchant_reference: "ABC123";
        response_code: "18000";
        response_message: "Success";
        return_url: "http://localhost:3000/en-ae/order/payment";
        service_command: "TOKENIZATION";
        signature: "8c954183f391ff11709bd5b54cc98c6ac463ec80a1c1455273820836c3a37324";
        status: "18";
        token_name: "a673d54ae2c2451ba4de4855278e5960";
    }

    1) Validate the payfort object
    2) Match the signature:
        a) signature value should be moved to another variable and remove from payfor_object
        b) remove integration_type and 3ds from payfort_object if its there.
    3) If card save options is on: save token_name, card_bin, expiry_date, card_no to local db
    */

    try {
        const order_no_arr =
            req.body.payfort_object.merchant_reference.split('-')

        const order = await Order.findOne(
            {
                order_no: `${order_no_arr[0]}-${order_no_arr[1]}-${order_no_arr[2]}-${order_no_arr[3]}`,
                payment_status: 'pending',
                order_status: 'pending',
            },
            {},
            { sort: { created_at: -1 } }
        )
            .populate('country')
            .populate('user')

        await TransactionLog.create({
            order_id: order._id,
            type: 'payfort',
            event: 'CLIENT-REQUEST',
            call_response: req.body.payfort_object,
        })

        if (!order) {
            return res.status(404).json({ error: 'Invalid Order' })
        }
        const ip = await getRequestIp(req)
        const payment_process = await PayFort.processMerchantPageResponse(
            req.body.payfort_object,
            order.amount_to_pay,
            order.country.currency,
            order.user,
            order.ip,
            order._id,
            req.brand?.settings
        )

        // BEGIN::Storing Log
        // AppLog.create({
        //     order_id: order._id,
        //     type: 'payfort',
        //     event: 'processMerchantPageResponse',
        //     call_request: {
        //         payfort_object: req.body.payfort_object,
        //         amount_to_pay: order.amount_to_pay,
        //         currency: order.country.currency,
        //         user: order.user,
        //     },
        //     call_response: payment_process,
        // })
        // END::Storing Log

        if (payment_process) {
            order.payment_response = payment_process.params
            await order.save()
            // if (req.body.save_card) {
            await User.updateOne(
                { _id: order.user._id },
                {
                    $push: {
                        payment_cards: [req.body.payfort_object],
                    },
                }
            )
            // }
        }

        return res.json(payment_process)
    } catch (e) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const orderFinish = async (req, res) => {
    const schema = Joi.object({
        // order_id: Joi.string().required().hex().length(24),
        merchant_reference: Joi.string().required(),
        save_card: Joi.boolean().allow(null).optional(),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    const order_no_arr = req.body.merchant_reference.split('-')

    const order = await Order.findOne(
        {
            order_no: `${order_no_arr[0]}-${order_no_arr[1]}-${order_no_arr[2]}-${order_no_arr[3]}`,
            payment_status: 'pending',
            semnox_status: 'pending',
            order_status: 'pending',
        },
        {},
        { sort: { created_at: -1 } }
    )
        .select('-__v -updated_at -deletedAt -isDeleted')
        .populate('country')
        .populate('user', 'first_name last_name email mobile new_user')

    if (!order) {
        return res.status(404).json({ error: 'Invalid order' })
    }

    // checking payfort payment status before submitting to semnox
    const payment_status = await PayFort.statusCheck(order)
    // BEGIN::Storing Log
    // AppLog.create({
    //     order_id: order._id,
    //     type: 'payfort',
    //     event: 'statusCheck',
    //     call_request: {
    //         order_id: order._id,
    //         order_no: order.no,
    //     },
    //     call_response: payment_status,
    // })
    // END::Storing Log

    // Order payment_status should be changed to success / fail after status check
    if (payment_status.transaction_message != 'Success') {
        removeSavedCreditCard(
            order.user._id,
            req.body.merchant_reference,
            false
        )
        order.payment_status = 'failed'
        await order.save()
        return res.status(402).json({ error: 'Payment Status is not verified' })
    } else {
        order.payment_status = 'success'
        await order.save()

        if (!req.body.save_card) {
            // BEGIN::Removing saved payment card
            removeSavedCreditCard(
                order.user._id,
                req.body.merchant_reference,
                true
            )
            // END::Removing saved payment card
        } else {
            // BEGIN::Saving payment card
            await User.findOneAndUpdate(
                {
                    _id: order.user._id,
                    'payment_cards.merchant_reference':
                        req.body.merchant_reference,
                },
                {
                    $set: {
                        'payment_cards.$.saved': true,
                    },
                }
            )
            // END::Saving payment card
        }

        semnoxOrderPushQueue(req.body.merchant_reference, req.authPublicUser)
        // pamOrderPushQueue(req.body.merchant_reference, req.authPublicUser)

        if (order.user.new_user) {
            await User.updateOne(
                {
                    _id: order.user._id,
                },
                {
                    new_user: false,
                }
            )
        }

        return res.status(200).json({
            message: 'success',
            order_no: order.order_no,
        })
    }
}

const payfortWebHookFeedback = async (req, res) => {
    await PayfortWebHookLog.create({
        type: 'feedback',
        call_request_header: req.headers,
        call_request_body: req.body,
    })
    return res.status(200).json('Entered to feedback webhook')
}

const payfortWebHookNotification = async (req, res) => {
    await PayfortWebHookLog.create({
        type: 'notification',
        call_request_header: req.headers,
        call_request_body: req.body,
    })
    return res.status(200).json('Entered to Notification webhook')
}

const semnoxOrderPushQueue = async (merchant_reference, user) => {
    try {
        const order_no_arr = merchant_reference.split('-')

        const order = await Order.findOne(
            {
                order_no: `${order_no_arr[0]}-${order_no_arr[1]}-${order_no_arr[2]}-${order_no_arr[3]}`,
                payment_status: 'success',
                semnox_status: 'pending',
                order_status: 'pending',
            },
            {},
            { sort: { created_at: -1 } }
        )
            .select('-__v -updated_at -deletedAt -isDeleted')
            .populate('brand')
            .populate('country')
            .populate('user', 'first_name last_name email mobile')

        if (!order) {
            // return res.status(404).json({ error: 'Invalid order' })
            fileLogger(
                'Invalid Order',
                'semnox-order-push-queue',
                'transaction',
                'error'
            )
            // console.log('Invalid Order')
            return false
        }

        // console.log(user.selected_brand)
        const transactionEstimate = await Semnox.transactionEstimate(
            user,
            order
        )

        // console.log(transactionEstimate)

        if (!transactionEstimate.status) {
            // TODO:: Slack notification
            // return res.status(400).json({
            //     error: `Semnox estimate api error : ${transactionEstimate.data}`,
            // })
            orderNotification(order)
            fileLogger(
                `Semnox estimate api error : ${transactionEstimate.data}`,
                'semnox-order-push-queue',
                'transaction',
                'error'
            )
            // console.log(
            //     `Semnox estimate api error : ${transactionEstimate.data}`
            // )
            return false
        }
        //TODO: Discount transaction should clarified from semnox.
        // const applyDiscount = await Semnox.applyDiscount(user, order)
        const closeTransaction = await Semnox.closeTransaction(
            user,
            order,
            transactionEstimate
        )

        if (!closeTransaction.status) {
            // TODO:: Slack notification
            // return res.status(400).json({
            //     error: `Semnox close transaction api error : ${closeTransaction.data}`,
            // })
            orderNotification(order)
            fileLogger(
                `Semnox estimate api error : ${closeTransaction.data}`,
                'semnox-order-push-queue',
                'transaction',
                'error'
            )
            // console.log(
            //     `Semnox close transaction api error : ${closeTransaction.data}`
            // )
            return false
        }

        removeCache([`${order.user._id}-linked-semnox-cards`])

        // BEGIN:: CARD fetching - filtering - linking process
        // 1) Pulling Free toy cards if available
        let free_toy_cards = []
        if (order.has_free_toy) {
            const available_free_toy = await Product.findOne({
                product_type: 'free_toy',
                published: true,
            })
            if (available_free_toy) {
                free_toy_cards = collect(
                    closeTransaction.data.TransactionLinesDTOList
                )
                    .where('ProductId', parseInt(available_free_toy.semnox.id))
                    .pluck('CardNumber')
                    .toArray()
                order.free_toy.received_card_nos = free_toy_cards
            }
        }

        // 2) Pulling new cards. It is identifying by CardId (-1) value from Estimate Transaction API.
        // const registered_cards_array = await collect(
        //     transactionEstimate.data.TransactionLinesDTOList
        // )
        //     .whereNotIn('CardId', [-1])
        //     .unique('CardId')

        const new_cards_array = await collect(
            transactionEstimate.data.TransactionLinesDTOList
        ).where('CardId', -1)

        const order_items = collect(order.items)
        const order_items_to_update = []
        const cards_to_skip_from_loop = []
        await order_items.each(async (item) => {
            const new_card_det = new_cards_array
                // .where('CardId', -1)
                .where('ProductId', parseInt(item.semnox.id))
                .whereNotIn('CardNumber', cards_to_skip_from_loop)
                // .unique('CardId')
                .first()

            fileLogger(new_card_det, 'newcard-card-det', 'debug', 'debug')

            if (item.new_card == true && new_card_det) {
                cards_to_skip_from_loop.push(new_card_det['CardNumber'])
                // console.log(new_card_det)
                // temp_item.card.card_number = new_card_det['CardNumber']
                order_items_to_update.push({
                    _id: item._id,
                    product_id: item.product_id,
                    name: item.name,
                    semnox: item.semnox,
                    actual_price: item.actual_price,
                    sales_price: item.sales_price,
                    new_card: item.new_card,
                    transaction_type: item.transaction_type,
                    qty: item.qty,
                    card: {
                        card_name: item.card.card_name,
                        card_number: new_card_det['CardNumber'],
                    },
                    pam: item.pam,
                })
            } else {
                order_items_to_update.push(item)
            }
        })

        order.items = order_items_to_update
        await order.save()

        // 3) Mapping new CardNumber with its CardId and creating array of objects to link with Customer.
        // console.log(collect(new_cards_array).pluck('CardNumber').toArray())

        const new_cards_to_link = []
        await collect(closeTransaction.data.TransactionLinesDTOList)
            .whereIn(
                'CardNumber',
                collect(new_cards_array).pluck('CardNumber').toArray()
            )
            .whereNotIn('CardNumber', free_toy_cards)
            .unique('CardId')
            .all()
            .map((item) => {
                // console.log(item)
                const new_card_item_collection = collect(order_items_to_update)
                    .where('card.card_number', item.CardNumber)
                    .where('new_card', true)
                if (new_card_item_collection.count()) {
                    new_cards_to_link.push({
                        brand: order.brand._id,
                        country: order.country._id,
                        user: user._id,
                        semnox_account_id: item.CardId,
                        card_name:
                            new_card_item_collection.first()?.card?.card_name,
                        card_number: item.CardNumber,
                        linked_date: new Date(),
                    })
                }
            })

        // END:: CARD fetching and filtering process

        await UserCard.create(new_cards_to_link)

        new_cards_to_link.map(async (card) => {
            const link = await Semnox.linkCardToCustomer(
                user.selected_brand,
                card.semnox_account_id,
                card.card_number,
                user.semnox_user_id,
                order._id
            )
            if (!link) {
                // TODO::connected card should be removed from our local db
                console.error('Semnox Card Linking Error')
            }
        })

        order.semnox_transaction_id = closeTransaction?.data?.TransactionId
        order.semnox_transaction_otp = closeTransaction?.data?.TransactionOTP
        order.semnox_status = 'success'
        order.order_status = 'success'
        await order.save()

        // Pushing to PAM
        console.log('Pushing to PAM')
        pamOrderPushQueue(merchant_reference, user)

        // return res.json(order)
        await Cart.deleteMany({
            user: user._id,
        })

        const toy_cards = function (name) {
            this.card = name
        }
        const brand_settings = await Settings.findOne({
            brand: order.brand,
            country: order.country,
        })

        if (brand_settings?.notification_settings?.mailgun) {
            let mg_settings = brand_settings.notification_settings.mailgun
            let has_otp = false
            if (
                order.free_toy?.received_card_nos?.length ||
                collect(order.items).where('new_card', true).count()
            ) {
                has_otp = true
            }
            purchaseNotification(
                mg_settings.from || 'noreply@funcity.ae',
                order.user.email,
                `Order Complete - ${order.order_no}`,
                mg_settings.order_complete_template,
                {
                    order: new OrderResource(order).exec(),
                    has_new_cards: collect(order.items)
                        .where('new_card', true)
                        .count(),
                    toy_cards: collect(order.free_toy?.received_card_nos)
                        .mapInto(toy_cards)
                        .all(),
                    toycard_column_width:
                        100 / (order.free_toy?.received_card_nos || 1),
                    generic_details: {
                        brand: order.brand,
                        invoice_address:
                            brand_settings.ecommerce_settings.invoice_address
                                .en,
                        terms_and_conditions:
                            brand_settings.ecommerce_settings
                                .terms_and_conditions.en,
                        footer_text:
                            brand_settings.ecommerce_settings.footer_text.en,
                        trn_number:
                            brand_settings.ecommerce_settings.trn_number,
                        vat_percentage:
                            brand_settings.ecommerce_settings.vat_percentage,
                    },
                    has_otp: has_otp,
                    year: 2022,
                },
                mg_settings
            )
        }

        return true
    } catch (e) {
        // console.log(e)
        Sentry.captureException(e)
        return false
    }
}

const pamOrderPushQueue = async (merchant_reference, user) => {
    console.log('PUSHING TO PAM')
    try {
        const order_no_arr = merchant_reference.split('-')

        const order = await Order.findOne(
            {
                order_no: `${order_no_arr[0]}-${order_no_arr[1]}-${order_no_arr[2]}-${order_no_arr[3]}`,
                payment_status: 'success',
                semnox_status: 'success',
                pam_status: 'pending',
                order_status: 'success',
            },
            {},
            { sort: { created_at: -1 } }
        )
            .select('-__v -updated_at -deletedAt -isDeleted')
            .populate('brand')
            .populate('country')
            .populate('user', 'first_name last_name email mobile')

        if (!order) {
            // return res.status(404).json({ error: 'Invalid order' })
            fileLogger(
                'Invalid Order',
                'semnox-order-push-queue',
                'transaction',
                'error'
            )
            // console.log('Invalid Order')
            return false
        }

        // console.log(user.selected_brand)
        console.log('PAM::')
        const pamOrder = await PAM.renewMembership(user, order)

        // console.log(transactionEstimate)

        if (!pamOrder) {
            // TODO:: Slack notification
            // return res.status(400).json({
            //     error: `Semnox estimate api error : ${transactionEstimate.data}`,
            // })
            orderNotification(order)
            fileLogger(
                `PAM api error : ${pamOrder.data}`,
                'pam-order-push-queue',
                'transaction',
                'error'
            )
            // console.log(
            //     `Semnox estimate api error : ${transactionEstimate.data}`
            // )
            return false
        }
        //TODO: Discount transaction should clarified from semnox.
        // const applyDiscount = await Semnox.applyDiscount(user, order)

        // removeCache([`${order.user._id}-linked-semnox-cards`])
        return true
    } catch (e) {
        // console.log(e)
        Sentry.captureException(e)
        return false
    }
}

const deleteOldPendingCheckouts = async (user) => {
    await Order.softDelete({
        user: user,
        payment_status: 'pending',
        order_status: 'pending',
        created_at: { $lt: subMinutes(new Date(), 1 * 60) },
    })
}

module.exports = {
    checkoutProcess,
    applyCoupon,
    removeAppliedCoupon,
    paymentAuth,
    paymentProcess,
    orderFinish,
    payfortWebHookFeedback,
    payfortWebHookNotification,
}
