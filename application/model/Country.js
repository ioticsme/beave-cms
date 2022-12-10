const mongoose = require('mongoose')

const CountrySchema = new mongoose.Schema(
    {
        name: {
            type: Object,
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        currency: {
            type: String,
        },
        currency_symbol: {
            type: String,
        },
        currency_decimal_points: {
            type: Number,
            default: 2,
        },
        timezone: {
            type: String,
            default: 'Asia/Dubai',
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

module.exports = mongoose.model('Country', CountrySchema)
