const { mongoose, Schema } = require('mongoose')
const { formatInTimeZone } = require('date-fns-tz')
const { format } = require('date-fns')
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const CouponSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        code: [
            new mongoose.Schema({
                code: {
                    type: String,
                    required: true,
                },
                usage_count: {
                    type: Number,
                    default: 0,
                },
            }),
        ],
        coupon_type: {
            type: String, // fixed,percentage,bogo,free
            required: true,
            enum: ['fixed', 'percentage', 'bogo', 'free'],
        },
        user_type: {
            type: String, //all,new
            required: true,
        },
        user_level_limit: {
            type: Number,
            default: 1,
        },
        is_group: {
            type: Boolean,
            default: false,
        },
        no_of_uses_total: {
            type: Number,
        },
        total_usage_count: {
            type: Number,
            default: 0,
        },
        // users: [
        //     {
        //         type: Schema.ObjectId,
        //         ref: 'User',
        //     },
        // ],
        free_product: {
            type: Schema.ObjectId,
            ref: 'Product',
        },
        products: [{ type: Schema.ObjectId, ref: 'Product' }],
        discount_value: {
            type: Number,
        },
        minimum_order: {
            type: Number,
        },
        minimum_order_per_card: {
            type: Number,
        },
        maximum_discount: {
            type: Number,
        },
        start_date: {
            type: Date,
        },
        end_date: {
            type: Date,
        },
        expiry: {
            type: Boolean,
            default: false,
        },
        author: {
            type: Schema.ObjectId,
            ref: 'Admin',
        },
        brand: {
            type: Schema.ObjectId,
            ref: 'Brand',
        },
        country: {
            type: Schema.ObjectId,
            ref: 'Country',
        },
        published: {
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

CouponSchema.plugin(softDeletePlugin)

CouponSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

CouponSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

CouponSchema.virtual('start_d').get(function () {
    return format(this.start_date, 'yyyy-MM-dd')
})

CouponSchema.virtual('end_d').get(function () {
    return format(this.end_date || new Date(), 'yyyy-MM-dd')
})

module.exports = mongoose.model('Coupon', CouponSchema)
