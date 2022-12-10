// "https://smsapi.aptivadigi.com/api/?username=iotic&password=Iotics@324&cmd=sendSMS&message=Dear+customer%2C+your+one+time+password+%28OTP%29+for+ordering+from+Akawi+Oven+is+513391&sender=EATROOT&uniCode=0&to=971566994313"
require('dotenv').config()
const axios = require('axios')

const sendAdminNotification = async (message) => {
    axios.post(`${process.env.SLACK_ADMIN_CHANNEL}`, {
        username: 'LML-OTP',
        text: message,
    })
}

const orderNotification = async (order) => {
    // const test = {
    //     attachments: [
    //         {
    //             color: '#f2c744',
    //             blocks: [
    //                 {
    //                     type: 'section',
    //                     text: {
    //                         type: 'mrkdwn',
    //                         text: 'You have a new request:\n*<fakeLink.toEmployeeProfile.com|Fred Enriquez - New device request>*',
    //                     },
    //                 },
    //                 {
    //                     type: 'section',
    //                     fields: [
    //                         {
    //                             type: 'mrkdwn',
    //                             text: '*Type:*\nComputer (laptop)',
    //                         },
    //                         {
    //                             type: 'mrkdwn',
    //                             text: '*When:*\nSubmitted Aut 10',
    //                         },
    //                         {
    //                             type: 'mrkdwn',
    //                             text: '*Last Update:*\nMar 10, 2015 (3 years, 5 months)',
    //                         },
    //                         {
    //                             type: 'mrkdwn',
    //                             text: "*Reason:*\nAll vowel keys aren't working.",
    //                         },
    //                         {
    //                             type: 'mrkdwn',
    //                             text: '*Specs:*\n"Cheetah Pro 15" - Fast, really fast"',
    //                         },
    //                     ],
    //                 },
    //                 {
    //                     type: 'actions',
    //                     elements: [
    //                         {
    //                             type: 'button',
    //                             text: {
    //                                 type: 'plain_text',
    //                                 emoji: true,
    //                                 text: 'Approve',
    //                             },
    //                             style: 'primary',
    //                             value: 'click_me_123',
    //                         },
    //                         {
    //                             type: 'button',
    //                             text: {
    //                                 type: 'plain_text',
    //                                 emoji: true,
    //                                 text: 'Deny',
    //                             },
    //                             style: 'danger',
    //                             value: 'click_me_123',
    //                         },
    //                     ],
    //                 },
    //             ],
    //         },
    //     ],
    // }

    await axios.post(
        `${process.env.SLACK_ADMIN_CHANNEL}`,
        {
            // username: 'LML-OTP',
            // text: 'I hope the tour went well, Mr. Wonka.',
            attachments: [
                {
                    color:
                        order.order_status == 'success' ? '#38be25' : '#Ff0606',
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `You have a new order: ${order.order_no}`,
                            },
                        },
                        {
                            type: 'section',
                            fields: [
                                {
                                    type: 'mrkdwn',
                                    text: `*Order No:*\n ${order.order_no}`,
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*Name:*\n ${order.user.first_name} ${order.user.last_name}`,
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*Paid Amount:*\n ${order.amount_to_pay}`,
                                },
                            ],
                        },
                        // {
                        //     type: 'actions',
                        //     elements: [
                        //         {
                        //             type: 'button',
                        //             text: {
                        //                 type: 'plain_text',
                        //                 emoji: true,
                        //                 text: 'View Order',
                        //             },
                        //             style: 'primary',
                        //             value: 'click_me_123',
                        //         },
                        //         // {
                        //         //     type: 'button',
                        //         //     text: {
                        //         //         type: 'plain_text',
                        //         //         emoji: true,
                        //         //         text: 'Deny',
                        //         //     },
                        //         //     style: 'danger',
                        //         //     value: 'click_me_123',
                        //         // },
                        //     ],
                        // },
                    ],
                },
            ],
        },
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )
}

module.exports = {
    sendAdminNotification,
    orderNotification,
}
