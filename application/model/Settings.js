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
        semnox_base_url: {
            type: String,
        },
        semnox_login_id: {
            type: String,
        },
        semnox_password: {
            type: String,
        },
        semnox_site_id: {
            type: String,
        },
        semnox_machine_name: {
            type: String,
        },
        semnox_payment_mode: {
            type: Number,
            required: true,
        },
        // semnox_package_group_id: {
        //     type: String,
        // },
        // semnox_free_product_group_id: {
        //     type: String,
        // },
        // semnox_var_coupon_id: {
        //     type: String,
        // },
        // semnox_has_toy_promo: {
        //     type: Boolean,
        // },
        // semnox_toy_promo_value: {
        //     type: Number,
        // },
        semnox_free_toy_available: {
            type: Boolean,
        },
        semnox_free_toy_threshold: {
            type: Double,
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
