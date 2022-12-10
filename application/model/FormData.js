const { formatInTimeZone } = require('date-fns-tz')
const { mongoose, Schema } = require('mongoose')

const FormDataSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['contact-form', 'birthday-package'],
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        mobile: {
            type: String,
            required: true,
        },
        date: {
            type: Date,
        },
        time: {
            type: String,
        },
        pacakge_id: {
            type: Schema.ObjectId,
            ref: 'Content',
        },
        store: {
            type: Schema.ObjectId,
            ref: 'Content',
        },
        comment: {
            type: String,
        },
        message: {
            type: String,
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
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

FormDataSchema.virtual('date_booked').get(function () {
    return formatInTimeZone(
        this.date ? this.date : new Date(),
        'Asia/Dubai',
        'dd/MM/yyyy'
    )
})
FormDataSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

FormDataSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('FormData', FormDataSchema)
