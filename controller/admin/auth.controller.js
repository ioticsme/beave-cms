require('dotenv').config()
const Joi = require('joi')
const bcrypt = require('bcrypt')
const Admin = require('../../model/Admin')
const Brand = require('../../model/Brand')
var session = require('express-session')
const Settings = require('../../model/Settings')

const login = async (req, res) => {
    try {
        res.render(`admin/authentication/sign-in`)
    } catch (error) {
        res.render(`admin/error-404`)
    }
}

const loginSubmit = async (req, res) => {
    try {
        const schema = Joi.object({
            email: Joi.string().email().required().max(60),
            password: Joi.string().required().min(4).max(15),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            res.status(422).json(validationResult.error)
            return
        }

        const admin = await Admin.findOne({
            email: req.body.email,
            active: true,
            // isDeleted: false,
        })

        if (!admin) {
            res.status(401).json({ error: 'Invalid email or password' })
            return
        }

        if (bcrypt.compareSync(req.body.password, admin.password)) {
            const brand = await Brand.findOne()
                .populate({
                    path: 'languages',
                    options: { sort: { is_default: -1 } },
                })
                .populate('domains.country')

            session = req.session
            session.admin_id = admin._id
            session.admin_name = admin.name
            session.admin_role = admin.role
            const settings = await Settings.findOne({
                brand: brand,
                country: brand.domains[0].country._id,
            }).select('-brand -country -__v -created_at -updated_at -author')

            session.selected_brand = {
                _id: brand._id,
                name: brand.name,
                code: brand.code,
                languages: brand.languages,
                country: brand.domains[0].country._id,
                country_name: brand.domains[0].country.name.en,
                country_code: brand.domains[0].country.code,
                country_currency: brand.domains[0].country.currency,
                country_currency_symbol:
                    brand.domains[0].country.currency_symbol,
                settings: settings ? settings : {},
            }

            res.status(200).json(admin)
            return
        } else {
            res.status(401).json({ error: 'Invalid email or password' })
            return
        }
    } catch (error) {
        return res.status(404).json({ error: 'Something went wrong' })
    }
}

const forgotCredentials = async (req, res) => {
    res.status(200).json(`Login`)
}

const logout = async (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/admin/auth/login')
    } catch (error) {
        res.render(`admin/error-500`)
    }
}

module.exports = {
    login,
    loginSubmit,
    forgotCredentials,
    logout,
}
