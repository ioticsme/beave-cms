const { mongoose, Schema } = require('mongoose')
const { formatInTimeZone } = require('date-fns-tz')
const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const BannerSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            // unique: true,
        },
        title: {
            type: String,
            required: true,
        },
        in_home: {
            type: Boolean,
            default: false,
            set: function (e) {
                if (e == 'true' || e == true) {
                    return true
                } else {
                    return false
                }
            },
        },
        banner_type: {
            type: String,
            enum: ['web', 'app'],
            default: 'web',
        },
        author: {
            type: Schema.ObjectId,
            ref: 'Admin',
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
        published: {
            type: Boolean,
            default: false,
        },
        banner_items: [
            {
                title: {
                    en: String,
                    ar: String,
                },
                description: {
                    en: String,
                    ar: String,
                },
                btn_text: {
                    en: String,
                    ar: String,
                },
                position: {
                    type: Number,
                    default: 0,
                },
                btn_url: {
                    en: String,
                    ar: String,
                },
                images: {
                    common_image: {
                        en: {
                            media_url: {
                                type: String,
                            },
                            media_id: {
                                type: Schema.ObjectId,
                                ref: 'Media',
                            },
                        },
                        ar: {
                            media_url: {
                                type: String,
                            },
                            media_id: {
                                type: Schema.ObjectId,
                                ref: 'Media',
                            },
                        },
                    },
                    mobile_image: {
                        en: {
                            media_url: {
                                type: String,
                            },
                            media_id: {
                                type: Schema.ObjectId,
                                ref: 'Media',
                            },
                        },
                        ar: {
                            media_url: {
                                type: String,
                            },
                            media_id: {
                                type: Schema.ObjectId,
                                ref: 'Media',
                            },
                        },
                        default: {
                            en: {},
                            ar: {},
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

BannerSchema.plugin(softDeletePlugin)

BannerSchema.virtual('date_created').get(function () {
    return formatInTimeZone(
        this.created_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

BannerSchema.virtual('date_updated').get(function () {
    return formatInTimeZone(
        this.updated_at,
        'Asia/Dubai',
        'dd/MM/yyyy HH:mm:ss'
    )
})

module.exports = mongoose.model('Banner', BannerSchema)
