const { mongoose, Schema } = require('mongoose')

const ConfigSchema = new mongoose.Schema(
    {
        order_no: {
            type: Number,
            default: 1000,
            Comment: `This will be the next order no. Cahnge with cautious!!!`,
        },
        general: {
            client_name: {
                type: String,
                // required: true,
            },
            frontend_url: {
                type: String,
                // required: true,
            },
            push_notification: {
                type: Boolean,
                default: false,
            },
            slack: {
                type: Boolean,
                default: false,
            },
        },
        imagekit: {
            public_key: {
                type: String,
                default: null,
                // required: [true, 'Required for media storage'],
            },
            private_key: {
                type: String,
                default: null,
                // required: [true, 'Required for media storage'],
            },
            url: {
                type: String,
                default: null,
                // required: [true, 'Required for media storage'],
            },
            folder: {
                type: String,
                default: null,
                // required: [true, 'Required for media storage'],
            },
        },
        firebase: {
            admin_web: {
                type: Boolean,
                default: false,
            },
            user: {
                type: Boolean,
                default: false,
            },
            apiKey: {
                type: String,
                required: [function () {
                    return this.general.push_notification
                }, 'Required if you need push_notification'],
            },
            authDomain: {
                type: String,
                required: [function () {
                    return this.general.push_notification
                }, 'Required if you need push_notification'],
            },
            projectId: {
                type: String,
                required: [function () {
                    return this.general.push_notification
                }, 'Required if you need push_notification'],
            },
            storageBucket: {
                type: String,
                required: [function () {
                    return this.general.push_notification
                }, 'Required if you need push_notification'],
            },
            messagingSenderId: {
                type: String,
                required: [function () {
                    return this.general.push_notification
                }, 'Required if you need push_notification'],
            },
            appId: {
                type: String,
                required: [function () {
                    return this.general.push_notification
                }, 'Required if you need push_notification'],
            },
        },
        slack: {
            webhook_url: {
                type: String,
                required: [function () {
                    return this.general.slack
                }, 'Required if you need slack'],
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
