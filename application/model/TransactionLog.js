const { mongoose, Schema } = require('mongoose')
const _ = require('lodash')

const TransactionLogSchema = new mongoose.Schema(
    {
        order_id: {
            type: Schema.ObjectId,
            ref: 'Order',
            required: false,
        },
        user: {
            type: Schema.ObjectId,
            ref: 'User',
            required: false,
        },
        type: {
            type: String,
            required: true,
            enum: ['payfort', 'semnox', 'pam'],
        },
        event: {
            type: String,
            required: false,
        },
        url: {
            type: String,
            required: false,
        },
        call_request: {
            type: Object,
            required: false,
        },
        call_response: {
            type: Object,
            required: false,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

// TransactionLogSchema.pre('save', function (next) {
//     const html_removed_data = _.omit(this.call_response.data, [
//         'Receipt',
//         'TicketsHTML',
//         'ReceiptHTML',
//     ])
//     this.call_response = {
//         status: this.call_response.status,
//         data: html_removed_data,
//     }

//     next()
// })

TransactionLogSchema.virtual('call_response_html_removed').get(function () {
    // _.forIn(this.call_request, function (value, key) {
    //     console.log(key)
    // })
    const html_removed_data = _.omit(this.call_response.data, [
        'Receipt',
        'TicketsHTML',
        'ReceiptHTML',
    ])
    return {
        status: this.call_response.status,
        data: html_removed_data,
    }
})

module.exports = mongoose.model('TransactionLog', TransactionLogSchema)
