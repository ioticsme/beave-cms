const FormData = require('../../model/FormData')

let session

// Render banner group list
const contactFormList = async (req, res) => {
    try {
        session = req.authUser
        const data = await FormData.find({
            type: 'contact-form',
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        })
        res.render(`admin/forms/contact-list`, {
            data,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

// Render banner group list
const birthdayFormList = async (req, res) => {
    try {
        session = req.authUser
        const data = await FormData.find({
            type: 'birthday-package',
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        }).populate('store')

        res.render(`admin/forms/birthday-list`, {
            data,
        })
    } catch (error) {
        console.log(error)
        return res.render(`admin/error-404`)
    }
}

module.exports = {
    contactFormList,
    birthdayFormList,
}
