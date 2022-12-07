// "https://smsapi.aptivadigi.com/api/?username=iotic&password=Iotics@324&cmd=sendSMS&message=Dear+customer%2C+your+one+time+password+%28OTP%29+for+ordering+from+Akawi+Oven+is+513391&sender=EATROOT&uniCode=0&to=971566994313"
require('dotenv').config()
const path = require('path')
const axios = require('axios')
const Mailgun = require('mailgun.js')
const formData = require('form-data')
const fs = require('fs')

const sendEmail = async (
    from,
    to,
    subject,
    template,
    payloads,
    mg_settings,
    filePath = false
) => {
    const DOMAIN = mg_settings.domain
    const mailgun = new Mailgun(formData)
    const mg = mailgun.client({
        username: 'api',
        key: mg_settings.api_key,
        url: mg_settings.host,
    })

    // console.log(attachment)

    let attachment
    if (filePath) {
        const pdfPath = path.join(`${filePath}`)
        const file = {
            filename: 'invoice.pdf',
            data: await fs.promises.readFile(pdfPath),
        }
        attachment = [file]
    }
    const mailgunData = {
        from: `${from}`,
        to: `${to}`,
        subject: `${subject}`,
        template: `${template}`,
        attachment: attachment,
        'h:X-Mailgun-Variables': JSON.stringify(payloads),
    }

    return mg.messages.create(DOMAIN, mailgunData)
}

module.exports = {
    sendEmail,
}
