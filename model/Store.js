const { formatInTimeZone } = require('date-fns-tz')
const { mongoose, Schema } = require('mongoose')
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const StoreSchema = new mongoose.Schema(
    {
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
        name: {
            en: { type: String, required: true },
            ar: { type: String },
        },
        address: {
            en: { type: String, required: true },
            ar: { type: String},
        },
        city: {
            en: { type: String, required: true },
            ar: { type: String },
        },
        opening_hours: {
            en: { type: String, required: true },
            ar: { type: String },
        },
        coordinates: {
            lat: {
                type: String,
                required: true,
            },
            lng: {
                type: String,
                required: true,
            },
        },
        contact: {
            phone: String,
            email: String,
        },
        attractions: [
            {
                type: Schema.ObjectId,
                ref: 'Content',
                required: true,
            },
        ],
        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

StoreSchema.plugin(softDeletePlugin)

StoreSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

StoreSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('Store', StoreSchema)
