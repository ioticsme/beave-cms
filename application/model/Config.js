const { mongoose, Schema } = require('mongoose')

const ConfigSchema = new mongoose.Schema(
    {
        client_name: {
            type: String,
            // required: true,
        },
        frontend_url: {
            type: String,
        },
        order_no: {
            type: Number,
            default: 1000,
            Comment: `This will be the next order no. Cahnge with cautious!!!`,
        },
        has_cms: {
            type: Boolean,
            default: false,
        },
        has_ecommerce: {
            type: Boolean,
            default: false,
        },
        has_semnox: {
            type: Boolean,
            default: false,
        },
        has_pam: {
            type: Boolean,
            default: false,
        },
        has_booknow: {
            type: Boolean,
            default: false,
        },
        imagekit: {
            // type: Object,
            public_key: {
                type: String,
                default: null,
            },
            private_key: {
                type: String,
                default: null,
            },
            url: {
                type: String,
                default: null,
            },
            folder: {
                type: String,
                default: null,
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

module.exports = mongoose.model('Config', ConfigSchema)
