const { formatInTimeZone } = require('date-fns-tz')
const { mongoose, Schema } = require('mongoose')
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const CustomFormSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
        },
        form_name: {
            type: String,
            required: true,
        },
        reply_email_template: String,
        has_captcha: Boolean,
        recepient_emails: String,
        recepient_email_template: String,
        slack_url: String,
        custom_fields: [
            {
                field_name: {
                    type: String,
                    required: true,
                },
                // field_type: {
                //     type: String,
                // },
                validation: {
                    type: String,
                },
            },
        ],
        published: {
            type: Boolean,
            default: true,
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

CustomFormSchema.plugin(softDeletePlugin)

CustomFormSchema.virtual('date_booked').get(function () {
    return formatInTimeZone(
        this.date ? this.date : new Date(),
        'Asia/Dubai',
        'dd/MM/yyyy'
    )
})
CustomFormSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

CustomFormSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('CustomForm', CustomFormSchema)
