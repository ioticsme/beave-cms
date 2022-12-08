const { mongoose, Schema } = require('mongoose')
// const { softDeletePlugin } = require('soft-delete-plugin-mongoose')

const AdminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
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

module.exports = mongoose.model('Admin', AdminSchema)
