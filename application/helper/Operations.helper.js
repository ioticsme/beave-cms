require('dotenv').config()
const winston = require('winston')
const ImageKit = require('imagekit')
const Media = require('../model/Media')
var FileReader = require('filereader')
const { format } = require('date-fns')

// BEGIN:FOR PDF Generation
const fs = require('fs')
const path = require('path')
const utils = require('util')
// const puppeteer = require('puppeteer')
const hb = require('handlebars')
const { sendEmail } = require('./Mail.helper')
const { orderNotification } = require('./Slack.helper')
const { sendOrderSms } = require('./SMS.helper')
const readFile = utils.promisify(fs.readFile)
// END:FOR PDF Generation

const projectRootDir = require('path').resolve('./')

const getRequestIp = async (req) => {
    let ip = (
        req.headers['cf-connecting-ip'] ||
        req.headers['x-real-ip'] ||
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        ''
    ).split(',')

    if (ip[0].trim().substr(0, 7) == '::ffff:') {
        ip = ip[0].trim().substr(7)
    } else {
        ip = ip[0].trim()
    }

    return ip
}

const getVatAmount = async (amount, brand) => {
    const vat =
        amount -
        (amount /
            (100 +
                parseFloat(
                    brand.settings?.ecommerce_settings?.vat_percentage
                ))) *
            100

    return parseFloat(vat)
}

// const generatePdfInvoice = async (invocieData) => {
//     // console.log(order)
//     await fs.promises.mkdir('./uploads/invoices', { recursive: true })
//     // const today = new Date().toLocaleDateString().replaceAll('/','-')
//     const invoicePath = path.resolve(
//         './notifications/pdf-templates/order-complete.html'
//     )
//     const masterTemplate = await readFile(invoicePath, 'utf8')
//     // console.log('Compiing the template with handlebars')
//     const template = hb.compile(masterTemplate, { strict: true })
//     const result = template(invocieData)
//     const html = result
//     // we are using headless mode
//     const browser = await puppeteer.launch({
//         args: ['--no-sandbox', '--disable-setuid-sandbox'],
//     })
//     const page = await browser.newPage()
//     // We set the page content as the generated html by handlebars
//     await page.setContent(html)
//     // We use pdf function to generate the pdf in the same folder as this file.
//     await page.pdf({
//         path: `./uploads/invoices/${invocieData.order.order_no}.pdf`,
//         format: 'A4',
//         margin: { left: '0.5cm', top: '0', right: '0.5cm', bottom: '0.5cm' },
//     })
//     await browser.close()
//     console.log('PDF Generated')
//     return true
// }

const purchaseNotification = async (
    from,
    to,
    subject,
    template,
    payloads,
    mg_settings
) => {
    // await generatePdfInvoice(payloads)
    // const fileToAttach = `./uploads/invoices/${payloads.order.order_no}.pdf`
    const fileToAttach = false
    sendEmail(from, to, subject, template, payloads, mg_settings, fileToAttach)
    sendOrderSms(payloads)

    orderNotification(payloads.order)
}

const differenceInPercentage = async (currentVal = 0, prevVal = 0) => {
    return prevVal && currentVal ? ((currentVal - prevVal) / prevVal) * 100 : 0
}

const fileLogger = async (message, service, type, level = 'info') => {
    const logger = winston.createLogger({
        level: level,
        format: winston.format.json(),
        defaultMeta: {
            service: service,
            time: format(new Date(), 'dd-MM-yyyy HH:mm:ss'),
        },
        transports: [
            new winston.transports.File({
                filename: `./log/${type}-${format(
                    new Date(),
                    'dd-MM-yyyy'
                )}.log`,
                json: false,
                level: level,
                // stringify: (obj) => JSON.stringify(obj),
            }),
            // new winston.transports.File({ filename: 'combined.log' }),
        ],
    })

    logger.info({
        level: level,
        message: message,
    })
}

const createFcmSwJS = async (credentials) => {
    const wrapper_public_dir = `${projectRootDir}/public`
    if (!fs.existsSync(wrapper_public_dir)) {
        fs.mkdirSync(wrapper_public_dir)
    }
    var writeStream = fs.createWriteStream(
        `${wrapper_public_dir}/firebase-messaging-sw.js`
    )
    writeStream.write(
        `importScripts('https://www.gstatic.com/firebasejs/8.2.0/firebase-app.js')
        importScripts('https://www.gstatic.com/firebasejs/8.2.0/firebase-messaging.js')
        
        const firebaseConfig = {
            apiKey: '${credentials.apiKey}',
            authDomain: '${credentials.authDomain}',
            projectId: '${credentials.projectId}',
            storageBucket: '${credentials.storageBucket}',
            messagingSenderId: '${credentials.messagingSenderId}',
            appId: '${credentials.appId}',
        }
        
        firebase.initializeApp(firebaseConfig)
        const messaging = firebase.messaging()
        messaging.onBackgroundMessage(function (payload) {
            console.log(
                '[firebase-messaging-sw.js] Received background message ',
                payload
            )
            // Customize notification here
            const notificationTitle = 'Title'
            const notificationOptions = {
                body: payload,
                icon: '/firebase-logo.png',
            }
            self.registration.showNotification(notificationTitle, notificationOptions)
        });`
    )
    writeStream.end()
}

module.exports = {
    // generatePdfInvoice,
    purchaseNotification,
    getRequestIp,
    differenceInPercentage,
    fileLogger,
    getVatAmount,
    createFcmSwJS,
}
