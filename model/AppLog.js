const { mongoose, Schema } = require('mongoose')

const AppLogSchema = new mongoose.Schema(
    {
        order_id: {
            type: Schema.ObjectId,
            ref: 'Order',
        },
        type: {
            type: String,
            required: true,
            enum: ['payfort', 'semnox'],
        },
        event: {
            type: String,
            required: true,
        },
        call_request: {
            type: Object,
        },
        call_response: {
            type: Object,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

module.exports = mongoose.model('AppLog', AppLogSchema)
