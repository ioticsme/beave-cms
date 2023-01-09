const mongoose = require('mongoose')

const ContentTypeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        slug: {
            type: String,
            required: true,
        },
        admin_icon: {
            type: String,
            default: `<path opacity="0.3" d="M19 22H5C4.4 22 4 21.6 4 21V3C4 2.4 4.4 2 5 2H14L20 8V21C20 21.6 19.6 22 19 22Z" fill="currentColor"></path>
        <path d="M15 8H20L14 2V7C14 7.6 14.4 8 15 8Z" fill="currentColor"></path>`,
        },
        custom_fields: [
            {
                field_label: String,
                field_name: String,
                field_type: String, // TextInput, TextArea, Radio, Checkbox, Dropdown, File, Wysiwyg
                placeholder: String,
                bilingual: {
                    type: Boolean,
                    default: true,
                },
                options: [
                    {
                        label: String,
                        value: String,
                    },
                ],
                // values: [
                //     {
                //         key: {
                //             en: String,
                //             ar: String,
                //         },
                //         val: String
                //     }
                // ],
                addValidation: String,
                editValidation: String,
                validation: [
                    {
                        type: String,
                    },
                ],
                info: [
                    {
                        type: String,
                    },
                ],
            },
        ],
        custom_field_groups: [
            {
                row_name: String,
                row_label: String,
                repeater_group: Boolean,
                bilingual: Boolean,
                fields: [
                    {
                        field_label: String,
                        field_name: String,
                        field_type: String, // TextInput, TextArea, Radio, Checkbox, Dropdown, File, Wysiwyg
                        placeholder: String,
                        options: [
                            {
                                label: String,
                                value: String,
                            },
                        ],
                        addValidation: String,
                        editValidation: String,
                        validation: String,
                        info: [
                            {
                                type: String,
                            },
                        ],
                    },
                ],
            },
        ],
        allowed_type: [{ type: String }],
        template_name: {
            type: String,
            default: 'page',
        },
        position: {
            type: Number,
            default: 0,
        },
        in_use: {
            type: Boolean,
            default: true,
        },
        has_banner: {
            type: Boolean,
            default: false,
        },
        has_gallery: {
            type: Boolean,
            default: false,
        },
        has_form: {
            type: Boolean,
            default: false,
        },
        has_api_endpoint: {
            type: Boolean,
            default: true,
        },
        hide_title: {
            type: Boolean,
            default: false,
        },
        hide_body: {
            type: Boolean,
            default: false,
        },
        hide_excerpt: {
            type: Boolean,
            default: false,
        },
        hide_meta: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
)

module.exports = mongoose.model('ContentType', ContentTypeSchema)
