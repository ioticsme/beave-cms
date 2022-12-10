const { mongoose, Schema } = require('mongoose')

const ConfigSchema = new mongoose.Schema(
    {
        order_no: {
            type: Number,
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

module.exports = mongoose.model('Config', ConfigSchema)
