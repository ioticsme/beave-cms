const { mongoose, Schema } = require('mongoose')
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const CategorySchema = new mongoose.Schema(
    {
        slug: {
            type: String,
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
        position: {
            type: Number,
            default: 0,
        },
        brand: {
            type: Schema.ObjectId,
            ref: 'Brand',
        },
        country: {
            type: Schema.ObjectId,
            ref: 'Country',
            required: true,
        },
        image: {
            type: Object,
            default: null,
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

CategorySchema.plugin(softDeletePlugin)

module.exports = mongoose.model('Category', CategorySchema)
