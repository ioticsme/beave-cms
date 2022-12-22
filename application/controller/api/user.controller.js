require('dotenv').config()
const Joi = require('joi')
const { joiPasswordExtendCore } = require('joi-password')
const joiPassword = Joi.extend(joiPasswordExtendCore)
const { getCard, linkCardToCustomer } = require('../../helper/Semnox.helper')
const User = require('../../model/User')
const UserResource = require('../../resources/api/user.resource')
const collect = require('collect.js')
const bcrypt = require('bcrypt')
const UserCard = require('../../model/UserCard')
const CardResource = require('../../resources/api/card.resource')
const Order = require('../../model/Order')
const OrderResource = require('../../resources/api/order.resource')
const PaginationOrderResource = require('../../resources/api/paginationOrder.resource')
const { removeSavedToken } = require('../../helper/Payfort.helper')
const { setCache, getCache, removeCache } = require('../../helper/Redis.helper')
const { getParent, getPamMemberships } = require('../../helper/PAM.helper')
const PAMParentResource = require('../../resources/api/pamParent.resource')

// user detail
const detail = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.authPublicUser._id })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }
        res.status(200).json({
            user: new UserResource(user).exec(),
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

// Edit user detail
const editUser = async (req, res) => {
    try {
        const schema = Joi.object({
            first_name: Joi.string()
                .regex(/^[,. a-zA-Z]+$/)
                .required()
                .min(3)
                .max(20)
                .messages({
                    'string.pattern.base':
                        'First Name should contain only alphabets',
                }),
            last_name: Joi.string()
                .regex(/^[,. a-zA-Z]+$/)
                .required()
                .min(3)
                .max(20)
                .messages({
                    'string.pattern.base':
                        'Last Name should contain only alphabets',
                }),
            email: Joi.string().email().required().max(60),
            mobile: Joi.string().required().min(7).max(15),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json({
                details: validationResult.error.details,
            })
        }
        // Finding user
        let mobile = req.body.mobile.replace(/\D/g, '').replace(/^0+/, '')
        const user = await User.findOne({ mobile })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Checking the email already exist with other users
        const isEmailExist = await User.findOne({
            _id: { $ne: user._id },
            email: req.body.email,
        })
        if (isEmailExist) {
            return res.status(422).json({
                details: [
                    {
                        message: 'User already exist with this email',
                        path: ['email'],
                        type: 'any.exist',
                        context: {
                            label: 'email',
                            key: 'email',
                        },
                    },
                ],
            })
        }
        // Updating user data
        const update = await User.findOneAndUpdate(
            {
                _id: user._id,
            },
            {
                $set: {
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    email: req.body.email,
                    mobile: user.mobile,
                },
            },
            {
                new: true,
            }
        )
        if (!update?._id) {
            return res
                .status(400)
                .json({ error: 'User details submission error' })
        }

        res.status(200).json({
            message: 'User details updated',
            user: new UserResource(update).exec(),
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

// change user password
const changePassword = async (req, res) => {
    try {
        const schema = Joi.object({
            current_password: Joi.string().required().min(4).max(20),
            new_password: joiPassword
                .string()
                .minOfSpecialCharacters(1)
                .minOfLowercase(1)
                .minOfUppercase(1)
                .minOfNumeric(1)
                .noWhiteSpaces()
                .required()
                .min(8)
                .max(20),
            new_confirm_password: Joi.any()
                .valid(Joi.ref('new_password'))
                .required()
                .messages({
                    'any.only': 'password and confirm password must be same',
                }),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json({
                details: validationResult.error.details,
            })
        }
        // Finding user
        const user = await User.findOne({ _id: req.authPublicUser._id })

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }
        // comparing current password
        if (bcrypt.compareSync(req.body.current_password, user.password)) {
            const saltRounds = 10
            const salt = bcrypt.genSaltSync(saltRounds)
            // updating password
            const update = await User.findOneAndUpdate(
                { _id: user._id },
                {
                    $set: {
                        password: bcrypt.hashSync(req.body.new_password, salt),
                    },
                },
                {
                    new: true,
                }
            )
            if (!update?._id) {
                return res.status(400).json({ error: 'Password not changed' })
            }
            return res.status(200).json({
                message: 'Password changed',
                user: new UserResource(user).exec(),
            })
        } else {
            return res.status(422).json({
                details: [
                    {
                        message: '"current_password" is not valid',
                        path: ['current_password'],
                        type: 'any.invalid',
                        context: {
                            label: 'current_password',
                            key: 'current_password',
                        },
                    },
                ],
            })
        }
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const orderHistory = async (req, res) => {
    try {
        let { page, limit } = req.query
        if (!req.query.page) {
            page = 1
        }
        if (!req.query.limit) {
            limit = 20
        }

        // Pagination options
        const options = {
            page,
            limit,
            populate: 'country',
        }
        // Fetching orders with pagination
        const orders = await Order.paginate(
            {
                brand: req.brand._id,
                user: req.authPublicUser._id,
            },
            options
        )

        return res.status(200).json(new PaginationOrderResource(orders).exec())
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const orderDetail = async (req, res) => {
    try {
        // Fetching order details
        const order = await Order.findOne({
            brand: req.brand._id,
            user: req.authPublicUser._id,
            _id: req.params.id,
            // order_status: 'success',
        }).populate('country')

        if (!order) {
            return res.status(404).json({ error: `Not Found` })
        }
        return res.status(200).json(new OrderResource(order).exec())
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const listCard = async (req, res) => {
    /*
        =========== Steps to reproduce: =============
        1) Get all cards of auth user from local db and make it collection
        2) Call semnox getcards api to fetch all cards from semnox by using semnox CustomerId that is stored in our local db and make it collection
        3) Match semnox card collection with local colelction and show matching only
        4) Update the locally stored/linked card number by checking accountId
    */
    try {
        const user = await User.findOne({
            _id: req.authPublicUser._id,
        })
        let card_collection
        const user_cards = await getCache(`${user._id}-linked-semnox-cards`)
        if (user_cards && !req.query['no-cache']) {
            // console.log(user_cards)
            card_collection = JSON.parse(user_cards)
        } else {
            const localCards = await UserCard.find({
                user: req.authPublicUser._id,
            })

            if (!localCards.length) {
                return res.status(200).json([])
            }

            // @todo: added temporary call for looping accountIds. should be reverted back to single call
            // Getting cards linked to user from semnox
            const semnoxCards = await getCard(
                req.authPublicUser.selected_brand,
                'customerId',
                user.semnox_user_id,
                user._id
            )

            // return res.json(semnoxCards)
            // const semnoxCards = []
            // for (const card of localCards) {
            //     const cards = await getCard(
            //         req.authPublicUser.selected_brand,
            //         'accountId',
            //         card.semnox_account_id
            //          user._id
            //     )

            //     semnoxCards.push(cards[0])
            // }

            if (!semnoxCards?.length) {
                return res.status(400).json({ error: 'User has no cards' })
            }
            let matchedCards = []
            const semnox_card_collection = collect(semnoxCards)
            // Looping through the cards to macth user cards
            localCards.map(async (lc) => {
                // lc.semnox_account_id
                const matching_semnox_card = semnox_card_collection.firstWhere(
                    'AccountId',
                    parseInt(lc.semnox_account_id)
                )
                if (matching_semnox_card) {
                    let obj
                    if (matching_semnox_card.TagNumber != lc.card_number) {
                        // update card number if local card number is differ from respective semnox card
                        // console.log(semnoxCards[j])
                        const update = await UserCard.findOneAndUpdate(
                            {
                                _id: lc._id,
                                user: req.authPublicUser._id,
                            },
                            {
                                $set: {
                                    card_number: matching_semnox_card.TagNumber,
                                },
                            },
                            {
                                new: true,
                            }
                        )
                        obj = {
                            ...update._doc,
                            card_balance: {
                                regular:
                                    matching_semnox_card?.TotalBonusBalance ||
                                    0,
                                // matching_semnox_card?.AccountSummaryDTO
                                //     ?.CreditPlusBonus || 0,
                                funday:
                                    matching_semnox_card?.TotalCreditsBalance ||
                                    0,
                                // matching_semnox_card?.AccountSummaryDTO
                                //     ?.CreditPlusCardBalance || 0,
                                games:
                                    matching_semnox_card?.TotalGamesBalance ||
                                    0,
                                ticket:
                                    matching_semnox_card?.TotalTicketsBalance ||
                                    0,
                                // matching_semnox_card?.AccountSummaryDTO
                                //     ?.CreditPlusTickets || 0,
                            },
                        }
                    } else {
                        obj = {
                            ...lc._doc,
                            card_balance: {
                                regular:
                                    matching_semnox_card?.TotalBonusBalance ||
                                    0,
                                funday:
                                    matching_semnox_card?.TotalCreditsBalance ||
                                    0,
                                games:
                                    matching_semnox_card?.TotalGamesBalance ||
                                    0,
                                ticket:
                                    matching_semnox_card?.TotalTicketsBalance ||
                                    0,
                            },
                        }
                    }
                    matchedCards.push(obj)
                }
            })

            card_collection = CardResource.collection(matchedCards)
            setCache(
                `${user._id}-linked-semnox-cards`,
                JSON.stringify(card_collection),
                60 * 15 // 15 Minutes cache
            )
            // for (i = 0; i < localCards.length; i++) {
            //     for (j = 0; j < semnoxCards.length; j++) {
            //         console.log(semnoxCards[j].AccountId)
            //         console.log(localCards[j].semnox_account_id)
            //         if (
            //             semnoxCards[j].AccountId == localCards[i].semnox_account_id
            //         ) {
            //             console.log('Entered')
            //             let obj
            //             if (semnoxCards[j].TagNumber != localCards[i].card_number) {
            //                 // update card number if local card number is differ from respective semnox card
            //                 // console.log(semnoxCards[j])
            //                 const update = await UserCard.findOneAndUpdate(
            //                     {
            //                         _id: localCards[i]._id,
            //                         user: req.authPublicUser._id,
            //                     },
            //                     {
            //                         $set: {
            //                             card_number: semnoxCards[j].TagNumber,
            //                         },
            //                     },
            //                     {
            //                         new: true,
            //                     }
            //                 )
            //                 obj = {
            //                     ...update._doc,
            //                     card_balance: {
            //                         regular:
            //                             semnoxCards[j]?.AccountSummaryDTO
            //                                 ?.CreditPlusBonus || 0,
            //                         funday:
            //                             semnoxCards[j]?.AccountSummaryDTO
            //                                 ?.CreditPlusCardBalance || 0,
            //                         ticket:
            //                             semnoxCards[j]?.AccountSummaryDTO
            //                                 ?.CreditPlusTickets || 0,
            //                     },
            //                 }
            //             } else {
            //                 obj = {
            //                     ...localCards[i]._doc,
            //                     card_balance: {
            //                         regular:
            //                             semnoxCards[j]?.AccountSummaryDTO
            //                                 ?.CreditPlusBonus || 0,
            //                         funday:
            //                             semnoxCards[j]?.AccountSummaryDTO
            //                                 ?.CreditPlusCardBalance || 0,
            //                         ticket:
            //                             semnoxCards[j]?.AccountSummaryDTO
            //                                 ?.CreditPlusTickets || 0,
            //                     },
            //                 }
            //             }
            //             matchedCards.push(obj)
            //         }
            //     }
            // }
        }

        return res.status(200).json({
            cards: card_collection,
            navigation: req.navigation,
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const addCard = async (req, res) => {
    try {
        const schema = Joi.object({
            card_name: Joi.string().required(),
            card_number: Joi.string().required(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json({
                details: validationResult.error.details,
            })
        }

        const isUsed = await UserCard.find({
            card_number: req.body.card_number,
        })

        if (isUsed?.length) {
            return res.status(400).json({ error: 'Card already used' })
        }

        const card = await getCard(
            req.authPublicUser.selected_brand,
            'accountNumber',
            req.body.card_number,
            req.authPublicUser._id
        )

        if (!card || !card[0]?.AccountId) {
            return res.status(400).json({ error: 'Invalid card' })
        }

        // Link card with user in semnox
        const link = await linkCardToCustomer(
            req.authPublicUser.selected_brand,
            card[0].AccountId,
            card[0].TagNumber,
            req.authPublicUser.semnox_user_id
        )
        if (!link.status) {
            // TODO::connected card should be removed from our local db
            return res.status(400).json({ error: 'Card not added' })
        }

        removeCache([`${req.authPublicUser._id}-linked-semnox-cards`])

        // Update card array field
        const save = await UserCard.create({
            brand: req.brand._id,
            country: req.country._id,
            user: req.authPublicUser._id,
            card_name: req.body.card_name,
            card_number: req.body.card_number,
            semnox_account_id: card[0].AccountId,
            linked_date: new Date(),
        })
        if (!save?._id) {
            return res.status(400).json({ error: 'Card not added' })
        }

        // add card id to user collection
        const update = await User.findOneAndUpdate(
            {
                _id: req.authPublicUser._id,
            },
            {
                $push: {
                    cards: save._id,
                },
            }
        )

        return res.status(200).json(new CardResource(save).exec())
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const unlinkCard = async (req, res) => {
    try {
        const schema = Joi.object({
            card_id: Joi.string().required(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json({
                details: validationResult.error.details,
            })
        }

        await UserCard.findOneAndRemove({
            user: req.authPublicUser._id,
            _id: req.body.card_id,
        })

        await removeCache([`${req.authPublicUser._id}-linked-semnox-cards`])

        const cards = await UserCard.find({
            user: req.authPublicUser._id,
            // _id: req.body.card_id,
        })

        card_collection = CardResource.collection(cards)
        setCache(
            `data-${req.authPublicUser._id}-linked-semnox-cards`,
            JSON.stringify(card_collection),
            60 * 15 // 15 Minutes cache
        )

        return res.status(200).json({
            cards: card_collection,
            navigation: req.navigation,
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const getPaymentCards = async (req) => {
    try {
        const user = await User.findOne({
            _id: req.authPublicUser._id,
        })
        if (!user?.payment_cards?.length) {
            return []
        }
        const saved_cards = collect(user.payment_cards)
            .where('saved', true)
            .all()
        return saved_cards
    } catch (error) {
        return false
    }
}

const listPaymentCard = async (req, res) => {
    const paymentCards = await getPaymentCards(req)

    if (paymentCards) return res.status(200).json(paymentCards)

    return res.status(500).json({ error: `Something went wrong` })
}

const deletePaymentCards = async (req, res) => {
    const schema = Joi.object({
        card_id: Joi.string().required(),
    })

    const validationResult = schema.validate(req.body, {
        abortEarly: false,
    })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    try {
        const user = await User.findOne({
            'payment_cards._id': req.body.card_id,
        })
        const req_card = collect(user.payment_cards).firstWhere(
            'id',
            req.body.card_id
        )
        if (!req_card) {
            return res.status(400).json({ error: 'Invalid Cardsss' })
        }

        // console.log('CARD:', req_card)

        const remove_token = await removeSavedToken(req_card)
        // console.log('RE CARD:', req_card)

        // if (!remove_token) {
        //     // TODO::send slack notification to admin
        //     return res.status(400).json({ error: 'Invalid Card' })
        // }

        await User.findOneAndUpdate(
            {
                _id: req.authPublicUser._id,
            },
            {
                $pull: {
                    payment_cards: { _id: req.body.card_id },
                },
            }
        )

        const paymentCards = await getPaymentCards(req)

        if (paymentCards) return res.status(200).json(paymentCards)

        return res.status(500).json({ error: `Something went wrong` })

        // return res.status(200).json('Card Deleted')
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: `Something went wrong` })
    }
}

// PAM Search Parent
const pamGetParent = async (req, res) => {
    try {
        const noCache = req.query['no-cache'] || false

        const cache_key = `pam-parent-${req.authPublicUser._id}`

        const parentData = await getCache(cache_key)
        let data = {};
        if (parentData && !req.query['no-cache']) {
            // console.log('FROM CACHE', cache_key)
            data = JSON.parse(parentData);
        } else {
            const parentDetail = await getParent(req.authPublicUser)
            // const parentDetail = await getParent(97477988020)
            if (!parentDetail) {
                return res.status(400).json({ error: 'PAM data not found' })
            }
            data = new PAMParentResource(parentDetail).exec();
            await removeCache(cache_key)
            await setCache(cache_key, JSON.stringify(data), 60 * 60)
            // console.log('cache set', cache_key)
        }
        res.status(200).json(data)
        // res.status(200).json(new PAMParentResource(data).exec())

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

// PAM Search Parent
const pamRenewableMemberships = async (req, res) => {
    try {
        const parentDetail = await getParent(req.authPublicUser)
        const pamMemberships = await getPamMemberships()
        // const parentDetail = await getParent(97477988020)
        if (!parentDetail) {
            return res.status(404).json({ error: 'PAM data not found' })
        }
        res.status(200).json(new PAMParentResource(parentDetail).exec())
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

module.exports = {
    detail,
    editUser,
    changePassword,
    listCard,
    addCard,
    unlinkCard,
    listPaymentCard,
    deletePaymentCards,
    orderHistory,
    orderDetail,
    pamGetParent,
}
