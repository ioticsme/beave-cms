const { formatInTimeZone } = require('date-fns-tz')
const { mongoose, Schema } = require('mongoose')
const Double = require('@mongoosejs/double');

const SettingsSchema = new mongoose.Schema(
    {
        brand: {
            type: Schema.ObjectId,
            ref: 'Brand',
        },
        country: {
            type: Schema.ObjectId,
            ref: 'Country',
        },
        author: {
            type: Schema.ObjectId,
            ref: 'Admin',
        },
        cache_expiry_time: {
            type: String,
        },
        ecommerce_settings: {
            invoice_address: {
                en: { type: String, default: null },
                ar: { type: String, default: null },
            },
            terms_and_conditions: {
                en: { type: String, default: null },
                ar: { type: String, default: null },
            },
            footer_text: {
                en: { type: String, default: null },
                ar: { type: String, default: null },
            },
            trn_number: {
                type: String,
                default: null,
            },
            vat_percentage: {
                type: Double,
                default: 5,
            },
            frontend_url: {
                type: String,
                default: 'https://funcity.ae',
            },
            free_toy_available: {
                type: Boolean,
            },
            free_toy_threshold: {
                type: Double,
            },
        },
        pam_settings: {
            location_id: { type: Number, default: null },
            zone_id: { type: Number, default: null }, 
        },
        notification_settings: {
            mailgun: {
                from: {
                    type: String,
                    default: '',
                },
                domain: {
                    type: String,
                    default: '',
                },
                api_key: {
                    type: String,
                    default: '',
                },
                otp_template: {
                    type: String,
                    default: '',
                },
                forgot_password_template: {
                    type: String,
                    default: '',
                },
                forgot_password_thankyou_template: {
                    type: String,
                    default: '',
                },
                order_complete_template: {
                    type: String,
                    default: '',
                },
                welcome_template: {
                    type: String,
                    default: '',
                },
            },
            sms: {
                sender_id: {
                    type: String,
                    default: '',
                },
                username: {
                    type: String,
                    default: '',
                },
                password: {
                    type: String,
                    default: '',
                },
            },
            communication_channels: {
                email: String,
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

SettingsSchema.virtual('date_updated').get(() => {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('Settings', SettingsSchema)
