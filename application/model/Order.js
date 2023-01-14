const { formatInTimeZone } = require('date-fns-tz')
const { mongoose, Schema } = require('mongoose')
const Double = require('@mongoosejs/double');
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
// const SchemaTypes = mongoose.Schema.Types;

const OrderSchema = new mongoose.Schema(
    {
        order_no: {
            type: String,
        },
        user: {
            type: Schema.ObjectId,
            ref: 'User',
        },
        brand: {
            type: Schema.ObjectId,
            ref: 'Brand',
        },
        country: {
            type: Schema.ObjectId,
            ref: 'Country',
        },
        amount: {
            type: Double,
            required: true,
        },
        amount_to_pay: {
            type: Double,
            required: true,
        },
        amount_from_card: {
            type: Double,
        },
        paid_at: {
            type: Date,
        },
        // items: [{ type: Schema.ObjectId, ref: 'Product' }],
        discount: {
            amount: {
                type: Double,
                default: 0,
            },
            applied_coupon: String,
            coupon: Object,
        },
        items: [
            new mongoose.Schema({
                product_id: {
                    type: Schema.ObjectId,
                    ref: 'Product',
                },
                name: Object,
                actual_price: Double,
                sales_price: Double,
                new_card: Boolean,
                // card_name: String,
                transaction_type: {
                    type: String,
                    enum: ['recharge', 'new'],
                },
                card: {
                    // _id: {
                    //     type: Schema.ObjectId,
                    // },
                    card_name: String,
                    card_number: String,
                },
                qty: Number,
                has_free_product: Boolean,
                free_product: {
                    _id: {
                        type: Schema.ObjectId,
                        ref: 'Product',
                    },
                    name: Object,
                },
                pam: Object
            }),
        ],
        has_free_toy: {
            type: Boolean,
            default: false,
        },
        free_toy_qty: {
            type: Number,
            default: 0,
        },
        ip: {
            type: String,
        },
        free_toy: {
            _id: {
                type: Schema.ObjectId,
                ref: 'Product',
            },
            name: Object,
            received_card_nos: [],
        },
        payment_method: {
            type: String,
            enum: ['online'],
        },
        payment_status: {
            type: String,
            enum: ['pending', 'success', 'failed', 'hold', 'cancelled'],
        },
        merchant_ref_v: {
            type: String,
            default: Date.now(),
        },
        pam_status: {
            type: String,
            enum: ['pending', 'success', 'failed', 'hold', 'cancelled'],
        },
        order_status: {
            type: String,
            required: true,
            enum: ['pending', 'success', 'failed', 'cancelled', 'abandoned'],
        },
        sale_invoice: {
            local_no: {
                type: String,
            },
        },
        card_reference: {
            type: Object,
        },
        vat: {
            percentage: {
                type: Number,
                default: 5,
            },
            excl: {
                type: Number,
                default: 0,
            },
            incl: {
                type: Number,
                default: 0,
            },
        },
        payment_response: {
            amount: String,
            response_code: String,
            card_number: String,
            card_holder_name: String,
            merchant_identifier: String,
            access_code: String,
            payment_option: String,
            customer_ip: String,
            fort_id: String,
            merchant_reference: String,
            currency: String,
            language: String,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

OrderSchema.index({'$**': 'text'})

OrderSchema.plugin(softDeletePlugin)
OrderSchema.plugin(mongoosePaginate)

OrderSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})
OrderSchema.virtual('date_created_display').get(function () {
    return formatInTimeZone(this.created_at, 'Asia/Dubai', 'dd/MM/yyyy')
})

OrderSchema.virtual('date_created_filter').get(function () {
    return formatInTimeZone(this.created_at, 'Asia/Dubai', 'yyyy-MM-dd')
})
OrderSchema.virtual('date_updated_display').get(function () {
    return formatInTimeZone(this.updated_at, 'Asia/Dubai', 'dd/MM/yyyy')
})

OrderSchema.virtual('date_updated_filter').get(function () {
    return formatInTimeZone(this.updated_at, 'Asia/Dubai', 'yyyy-MM-dd')
})

OrderSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('Order', OrderSchema)
