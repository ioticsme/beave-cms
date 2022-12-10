const { formatInTimeZone } = require('date-fns-tz')
const { mongoose, Schema } = require('mongoose')

const CustomFormDataSchema = new mongoose.Schema(
    {
        form_id:{
            type: Schema.ObjectId,
            ref: 'CustomForm',
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        field_values: Object,
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

CustomFormDataSchema.virtual('date_booked').get(function () {
    return formatInTimeZone(
        this.date ? this.date : new Date(),
        'Asia/Dubai',
        'dd/MM/yyyy'
    )
})
CustomFormDataSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

CustomFormDataSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('CustomFormData', CustomFormDataSchema)
