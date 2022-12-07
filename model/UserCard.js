const { formatInTimeZone } = require('date-fns-tz')
const { mongoose, Schema } = require('mongoose')
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const UserCardSchema = new Schema(
    {
        brand: {
            type: Schema.ObjectId,
            ref: 'Brand',
        },
        country: {
            type: Schema.ObjectId,
            ref: 'Country',
        },
        user: {
            type: Schema.ObjectId,
            ref: 'User',
        },
        semnox_account_id: {
            type: String,
            required: true,
        },
        card_name: {
            type: String,
        },
        card_number: {
            type: String,
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

UserCardSchema.plugin(softDeletePlugin)

UserCardSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

UserCardSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('UserCard', UserCardSchema)
