const { mongoose, Schema } = require('mongoose')
// const { softDeletePlugin } = require('soft-delete-plugin-mongoose')
const uniqueValidator = require('mongoose-unique-validator');

const AdminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            default: 'admin',
            enum: ['super_admin', 'admin', 'editor', 'finance'],
        },
        selected_brand: {
            brand: {
                type: Schema.ObjectId,
                ref: 'Brand',
            },
            country: {
                type: Schema.ObjectId,
                ref: 'Country',
            },
        },
        firebase_tokens: [{ type: String }],
        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

// AdminSchema.plugin(softDeletePlugin)
AdminSchema.plugin(uniqueValidator)

module.exports = mongoose.model('Admin', AdminSchema)
