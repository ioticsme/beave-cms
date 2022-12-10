require('dotenv').config()
const Joi = require('joi')
const Product = require('../../model/Product')
const Cart = require('../../model/Cart')
const CartResource = require('../../resources/api/cart.resource')
const { default: collect } = require('collect.js')
const User = require('../../model/User')
const UserCard = require('../../model/UserCard')

const getUserCart = async (req) => {
    try {
        const carts = await Cart.find({ user: req.authPublicUser._id })
            .populate(
                'product',
                'name description sales_price actual_price image'
            )
            .populate('card', 'card_name card_number')
            .select('-__v -updated_at -created_at -deletedAt -isDeleted')

        const cart_sum = collect(CartResource.collection(carts)).sum('item_sum')

        let has_free_toy = false
        let number_of_free_toy = 0
        if (req.brand.settings?.semnox_free_toy_available) {
            const freeToyEligibilityAmount =
                req.brand.settings?.semnox_free_toy_threshold
            has_free_toy = cart_sum >= freeToyEligibilityAmount
            number_of_free_toy =
                Math.floor(cart_sum / freeToyEligibilityAmount) || 0
        }

        return {
            has_free_toy: has_free_toy,
            number_of_free_toy: number_of_free_toy,
            cart_sum: cart_sum.toFixed(2),
            currency: req.country.currency_symbol,
            cart: CartResource.collection(carts),
        }
    } catch (err) {
        console.log(err)
        return false
    }
}

const list = async (req, res) => {
    try {
        const userCarts = await getUserCart(req)
        if (!userCarts) {
            return res.status(400).json({ error: `Bad Request` })
        }
        return res
            .status(200)
            .json({ user_cart: userCarts, navigation: req.navigation })
    } catch (err) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const add = async (req, res) => {
    const schema = Joi.object({
        product: Joi.string().required().hex().length(24),
        qty: Joi.number().required().min(1).max(30),
        type: Joi.string().required().valid('new', 'recharge'),
        new_card_name: Joi.string()
            .min(3)
            .max(20)
            .when('type', { is: 'new', then: Joi.required() }),
        card: Joi.string()
            .hex()
            .length(24)
            .when('type', { is: 'recharge', then: Joi.required() }),
        pam: Joi.object().optional(),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    try {
        const product = await Product.findOne({ _id: req.body.product })
        // TODO:: Validate product on semnox
        if (!product) {
            return res.status(422).json({
                details: [
                    {
                        message: 'invalid product',
                        context: {
                            label: 'product_id',
                            value: req.body.product,
                            key: 'product_id',
                        },
                    },
                ],
            })
        }

        if (req.body.card) {
            const user_card = await UserCard.findOne({ _id: req.body.card })
            if (!user_card) {
                return res.status(422).json({
                    details: [
                        {
                            message: 'invalid card',
                            context: {
                                label: 'card',
                                value: req.body.card,
                                key: 'card',
                            },
                        },
                    ],
                })
            }
        }

        const existInCart = await Cart.findOne({
            user: req.authPublicUser._id,
            product: req.body.product,
            card: req.body.card,
            card_name: req.body.new_card_name,
            type: req.body.type,
            isDeleted: false,
        })

        let saveCart
        if (!existInCart) {
            saveCart = await Cart.create({
                ...req.body,
                card_name: req.body.new_card_name,
                user: req.authPublicUser._id,
            })
        } else {
            const qty = existInCart.qty + parseInt(req.body.qty)
            existInCart.qty = qty
            saveCart = await existInCart.save()
        }

        if (!saveCart) {
            return res.status(400).json({ error: `Bad Request` })
        }
        const user_carts = await getUserCart(req)
        if (!user_carts) {
            return res.status(400).json({ error: `Bad Request` })
        }
        return res.status(200).json(user_carts)
    } catch (err) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const updateQty = async (req, res) => {
    const schema = Joi.object({
        cart_id: Joi.string().required().hex().length(24),
        qty: Joi.number().required(),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }
    try {
        const existInCart = await Cart.findOne({
            _id: req.body.cart_id,
        })
        if (!existInCart) {
            return res.status(422).json({
                details: [
                    {
                        message: 'invalid cart item',
                        context: {
                            label: 'cart_id',
                            value: req.body.cart_id,
                            key: 'cart_id',
                        },
                    },
                ],
            })
        }
        existInCart.qty = req.body.qty
        const saveCart = await existInCart.save()
        if (!saveCart) {
            return res.status(400).json({ error: `Bad Request` })
        }
        const user_carts = await getUserCart(req)
        if (!user_carts) {
            return res.status(400).json({ error: `Bad Request` })
        }
        return res.status(200).json(user_carts)
    } catch (err) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const remove = async (req, res) => {
    const schema = Joi.object({
        cart_id: Joi.string().required().hex().length(24),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }
    try {
        const existInCart = await Cart.findOne({
            _id: req.body.cart_id,
        })
        if (!existInCart) {
            return res.status(422).json({
                details: [
                    {
                        message: 'invalid cart item',
                        context: {
                            label: 'cart_id',
                            value: req.body.cart_id,
                            key: 'cart_id',
                        },
                    },
                ],
            })
        }
        const deleted = await Cart.deleteOne({ _id: req.body.cart_id })
        if (!deleted) {
            return res.status(400).json({ error: `Bad Request` })
        }
        const user_carts = await getUserCart(req)
        if (!user_carts) {
            return res.status(400).json({ error: `Bad Request` })
        }
        return res.status(200).json(user_carts)
    } catch (err) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

module.exports = {
    list,
    add,
    updateQty,
    remove,
}
