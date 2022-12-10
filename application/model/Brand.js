const { mongoose, Schema } = require('mongoose')

const BrandSchema = new mongoose.Schema(
    {
        name: {
            en: { type: String, required: true },
            ar: { type: String },
        },
        logo: {
            en: { type: Object },
            ar: { type: Object },
        },
        code: {
            type: String,
            required: true,
        },
        link: {
            type: String,
            default: '#',
        },
        active: {
            type: Boolean,
            default: true,
        },
        marketing: {
            gtm_id: {
                type: String,
                default: '',
            },
            google_analytics_id: {
                type: String,
                default: '',
            },
            google_token: {
                type: String,
                default: '',
            },
        },
        languages: [
            {
                type: Schema.ObjectId,
                ref: 'Language',
            },
        ],
        domains: [
            {
                logo: {
                    type: Object,
                },
                country: {
                    type: Schema.ObjectId,
                    ref: 'Country',
                },
                maintenance_mode: {
                    type: Boolean,
                    default: false,
                },
                ecommerce_maintenance_mode: {
                    type: Boolean,
                    default: false,
                },
                meta: {
                    type: Object,
                    default: {
                        title: {
                            en: String,
                            ar: String,
                        },
                        keywords: {
                            en: String,
                            ar: String,
                        },
                        description: {
                            en: String,
                            ar: String,
                        },
                        og_image: {
                            en: Object,
                            ar: Object,
                        },
                    },
                },
            },
        ],
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

module.exports = mongoose.model('Brand', BrandSchema)
