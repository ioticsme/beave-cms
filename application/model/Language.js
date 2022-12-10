const mongoose = require('mongoose')

const LanguageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        prefix: {
            type: String,
            required: true,
        },
        dir: {
            type: String,
        },
        is_default: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

module.exports = mongoose.model('Language', LanguageSchema)
