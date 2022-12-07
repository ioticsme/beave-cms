const { mongoose, Schema } = require('mongoose')
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const CartSchema = new mongoose.Schema(
    {
        user: {
            type: Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        product: {
            type: Schema.ObjectId,
            ref: 'Product',
            required: true,
        },
        card: {
            type: Schema.ObjectId,
            ref: 'UserCard',
            required: false,
        },
        card_name: {
            type: String,
        },
        qty: {
            type: Number,
            required: true,
            default: 1,
        },
        pam: {}
        // type: {
        //     type: String,
        //     required: true,
        //     enum: ['new', 'recharge'],
        // },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

CartSchema.plugin(softDeletePlugin)

module.exports = mongoose.model('Cart', CartSchema)
