const { mongoose, Schema } = require('mongoose')

const PayfortWebHookLogSchema = new mongoose.Schema(
    {
        type: String,
        call_request_header: {
            type: Object,
        },
        call_request_body: {
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

module.exports = mongoose.model('PayfortWebHookLog', PayfortWebHookLogSchema)
