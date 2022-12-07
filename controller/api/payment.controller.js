const Joi = require('joi')
const Payfort = require('../../helper/Payfort.helper')

const testSignature = async (req, res) => {
    // create order in database

    console.log('CREATE ORDER')

    const data = await Payfort.testSignature()

    return res.status(200).json({ message: 'Form Submitted', data: data })
}

const createOrder = async (req, res) => {
    // create order in database

    console.log('CREATE ORDER')

    const data = await Payfort.processRequest()

    return res.status(200).json({ message: 'Form Submitted', data: data })

    try {
        // const schema = Joi.object({
        //     name: Joi.string().required(),
        //     email: Joi.string().email().required(),
        //     mobile: Joi.string().required(),
        //     message: Joi.string().required(),
        // })

        // const validationResult = schema.validate(req.body, {
        //     abortEarly: false,
        // })

        // if (validationResult.error) {
        //     return res.status(422).json({
        // details: validationResult.error.details
        // })
        // }

        const iframeParams = {
            merchant_identifier: process.env.MERCHANT_IDENTIFIER,
            access_code: process.env.ACCESS_CODE,
            merchant_reference: merchantReference,
            service_command: 'TOKENIZATION',
            language: 'en',
            return_url: '/',
        }

        const data = {
            ...req.body,
            brand: req.brand._id,
            country: req.country._id,
        }

        // const save = await ContactForm.create(data)

        // if (!save?._id) {
        //     return res.status(400).json({ error: 'Something went wrong' })
        // }
        return res.status(200).json({ message: 'Form Submitted' })
    } catch (error) {
        return res.status(500).json({ error: 'Something error occured' })
    }
}

module.exports = {
    createOrder,
    testSignature,
}
