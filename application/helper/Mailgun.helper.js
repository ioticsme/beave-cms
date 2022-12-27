// "https://smsapi.aptivadigi.com/api/?username=iotic&password=Iotics@324&cmd=sendSMS&message=Dear+customer%2C+your+one+time+password+%28OTP%29+for+ordering+from+Akawi+Oven+is+513391&sender=EATROOT&uniCode=0&to=971566994313"
require('dotenv').config()
const path = require('path')
const axios = require('axios')
const Mailgun = require('mailgun.js')
const formData = require('form-data')
const fs = require('fs')

const mailGunTemplates = async (mg_settings) => {
    const DOMAIN = 'funcity.ae' //TODO: This value should be dynamic

    // const DOMAIN = 'funcity.ae'
    const mailgun = new Mailgun(formData)

    const client = mailgun.client({
        username: 'api',
        key: 'key-1ecdad0b98be252b695688f81049a00c' || '', //TODO: This value should be dynamic
    })

    // console.log(client)
    const domainTemplates = await client.domains.domainTemplates.list(DOMAIN, {
        limit: 30,
    })

    return domainTemplates
}

module.exports = {
    mailGunTemplates,
}
