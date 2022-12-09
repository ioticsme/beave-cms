const { mongoose, Schema } = require('mongoose')
const { formatInTimeZone } = require('date-fns-tz')
const { format } = require('date-fns')
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const ContentSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
        },
        type_id: {
            type: Schema.ObjectId,
            ref: 'ContentType',
            required: true,
        },
        type_slug: {
            type: String,
            required: true,
        },
        author: {
            type: Schema.ObjectId,
            ref: 'Admin',
            required: true,
        },
        brand: {
            type: Schema.ObjectId,
            ref: 'Brand',
            required: true,
        },
        country: {
            type: Schema.ObjectId,
            ref: 'Country',
            required: true,
        },
        banner: {
            type: Schema.ObjectId,
            ref: 'Banner',
            required: false,
        },
        gallery: {
            type: Schema.ObjectId,
            ref: 'Gallery',
            required: false,
        },
        attached_type: [
            {
                content_type: {
                    type: String,
                },
                items: [{ type: Schema.ObjectId, ref: 'Content' }],
            },
        ],
        published: {
            type: Boolean,
            default: false,
        },
        position: {
            type: Number,
            default:0,
        },
        template_name: {
            type: String,
        },
        in_home: {
            type: Boolean,
            default: false,
        },
        content: {
            type: Object,
            required: true,
        },
        // custom_fields: Object,
        meta: {
            en: {
                title: String,
                keywords: String,
                description: String,
                og_image: String,
            },
            ar: {
                title: String,
                keywords: String,
                description: String,
                og_image: String,
            },
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

ContentSchema.plugin(softDeletePlugin)

ContentSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

ContentSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('Content', ContentSchema)
