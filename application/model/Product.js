const { mongoose, Schema } = require('mongoose')
const { formatInTimeZone } = require('date-fns-tz')
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const ProductSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: true,
        },
        name: {
            en: {
                type: String,
                required: true,
            },
            ar: {
                type: String,
                required: true,
            },
        },
        description: {
            en: {
                type: String,
                required: true,
            },
            ar: {
                type: String,
                required: true,
            },
        },
        terms_and_conditions: {
            en: {
                type: String,
                required: false,
            },
            ar: {
                type: String,
                required: false,
            },
        },
        product_type: {
            type: String,
            required: true,
            default: 'regular',
            enum: ['regular', 'free_product', 'free_toy'],
        },
        sales_price: {
            type: Number,
        },
        actual_price: {
            type: Number,
            required: function () {
                if (this.product_type == 'regular') {
                    return true
                } else {
                    return false
                }
            },
        },
        category: [
            {
                type: Schema.ObjectId,
                ref: 'Category',
                required: function () {
                    if (this.product_type == 'regular') {
                        return true
                    } else {
                        return false
                    }
                },
            },
        ],
        membership: {
            is_membership: {
                type: Boolean,
                default: false
            },
            valid_pam_ids: [
                {
                    type: String,
                    required: false,
                }
            ] 
        },
        image: {
            type: Object,
            default: null,
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
        position: {
            type: Number,
            default: 0,
        },
        featured: {
            type: Boolean,
            default: false,
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

ProductSchema.plugin(softDeletePlugin)

ProductSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

ProductSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('Product', ProductSchema)
