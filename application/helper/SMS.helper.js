// "https://smsapi.aptivadigi.com/api/?username=iotic&password=Iotics@324&cmd=sendSMS&message=Dear+customer%2C+your+one+time+password+%28OTP%29+for+ordering+from+Akawi+Oven+is+513391&sender=EATROOT&uniCode=0&to=971566994313"
require('dotenv').config()
const axios = require('axios')
const User = require('../model/User')
const senderID = `Fun City`
// const baseURL = `https://smsapi.aptivadigi.com/api/?username=${process.env.APTIVA_USRNAME}&password=${process.env.APTIVA_PASSWORD}&cmd=sendSMS&message=`
const baseURL = `https://smsapi.aptivadigi.com/api/?username=lmleisure&password=Leisure@123&cmd=sendSMS&message=`

const sendSMS = async (mobile, senderID, message) => {
    console.log(mobile, senderID, message)
    // if (process.env.NODE_ENV == 'production') {
    axios
        .get(`${baseURL}${message}&sender=${senderID}&uniCode=0&to=${mobile}`)
        .then(function (response) {
            // console.log(response)
        })
        .catch(function (error) {
            console.log(error)
            // TODO::Send slack notification to the admin
        })
    // } else {
    //     axios.post(`${process.env.SLACK_ADMIN_CHANNEL}`, {
    //         username: 'LML-OTP',
    //         text: message,
    //     })
    // }
}

const sendOTP = async (otp, mobile, brand, smsSettings) => {
    const message = `Dear customer, your one time password for ${brand} is ${otp}`
    sendSMS(mobile, senderID, message)
}
const sendTransactionOTP = async (otp, mobile, brand) => {
    const message = `Thank you for your purchase at ${brand}.\nYour Transaction OTP is ${otp}.\nPlease show this OTP to ${brand} staff to complete your Transaction.`
    // console.log(message, mobile, senderID, message)
    sendSMS(mobile, senderID, message)
}
const sendThanks = async (message, mobile, brand, smsSettings) => {
    const senderID = `${smsSettings.sender_id}`
    const baseURL = `https://smsapi.aptivadigi.com/api/?username=${smsSettings.username}&password=${smsSettings.password}&cmd=sendSMS&message=`
    if (process.env.NODE_ENV == 'production') {
        sendSMS(mobile, senderID, message)
        // axios
        //     .get(
        //         `${baseURL}${message}&sender=${senderID}&uniCode=0&to=${mobile}`
        //     )
        //     .then(function (response) {
        //         // console.log(response)
        //     })
        //     .catch(function (error) {
        //         console.log(error)
        //         // TODO::Send slack notification to the admin
        //     })
    } else {
        if (
            globalModuleConfig.has_slack &&
            globalModuleConfig.slack_admin_channel
        ) {
            axios.post(`${globalModuleConfig.slack_admin_channel}`, {
                username: 'LML-OTP',
                text: message,
            })
        }
    }
}

async function sendOrderSms(payload) {
    // console.log('SENDING SMS:', payload)
    if (payload && payload.has_otp) {
        const user = await User.findOne({
            _id: payload.order.user._id,
        })
        // console.log('SENDING SMS TO: ', user.mobile)
        sendTransactionOTP(
            user.mobile,
            payload.generic_details.brand.name.en
        )
    }
}

module.exports = {
    sendOTP,
    sendThanks,
    sendTransactionOTP,
    sendOrderSms,
}
