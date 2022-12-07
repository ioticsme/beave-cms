const { mongoose } = require('mongoose')

const MediaSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
        },
        response: {
            type: Object,
            required: true,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

module.exports = mongoose.model('Media', MediaSchema)
