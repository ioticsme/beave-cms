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
        qty: {
            type: Number,
            required: true,
            default: 1,
        },
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
