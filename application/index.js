require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const Sentry = require('@sentry/node')
const Tracing = require('@sentry/tracing')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
var session = require('express-session')
const redis = require('redis')
var redisStore = require('connect-redis')(session)

const fs = require('fs')
const path = require('path')
var cors = require('cors')
var createError = require('http-errors')
const app = express()
const rateLimit = require('express-rate-limit')
const { format } = require('date-fns')

// BEGIN::Service Providers
const {
    baseConfig,
    authUser,
    mainNavGenerator,
    allBrands,
} = require('./middleware/cms.middleware')
// END::Service Providers

// BEGIN::Security Headers
// app.use(helmet())
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }))
app.use(helmet.frameguard({ action: 'deny' }))
app.use(helmet.xssFilter())
app.use(helmet.hidePoweredBy())
app.disable('x-powered-by')
// END::Security Headers

app.use(cors())

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Assets folder
app.use('/cms-static', express.static(path.join(__dirname, './public')))

//Configure redis client

var client = redis.createClient({
    url: `${process.env.REDIS_URL}`,
    legacyMode: true,
})

;(async () => {
    client.on('error', (err) => {
        console.log('Redis Client Error', err)
    })
    await client.connect()
})()

const sessionConfig = {
    store: new redisStore({
        // url: `${process.env.REDIS_URL}`,
        // legacyMode: true,
        // host: 'localhost',
        // port: 6379,
        client: client,
        // ttl: 260,
    }),
    secret: `${process.env.APP_KEY}`,
    saveUninitialized: false,
    resave: false,
    // cookie: {
    //     secure: false, // if true only transmit cookie over https
    //     httpOnly: false, // if true prevent client side JS from reading the cookie
    //     maxAge: 1000 * 60 * 60 * 24 // session max age in miliseconds
    // }
}

//session middleware
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
}
// sessionConfig.store = new RedisStore({ host: 'localhost', port: 6379, client: redisClient,ttl :  260}),

app.use(session(sessionConfig))

// console.log('SESSION STARTED')

app.use(cookieParser())

// app.use(ServiceProvider.moduleConfig)

// Template Engine
app.set('views', path.join(__dirname, '/views'))
// path.join(__dirname, '/views/admin/layouts')]);
app.set('view engine', 'pug')

// DB Connection
let dbSuccess = 'Fail'
mongoose
    .connect(process.env.DB_CONNECTION, {
        dbName: `${process.env.DB_NAME}`,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        dbSuccess = 'Success'
        console.log('DB Connected')
    })

var db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:')) //TODO::Send slack notification

global.globalModuleConfig = {}
const Config = require('./model/Config')
Config.findOne()
    .select('-order_no -created_at -updated_at -__v -_id')
    .then(async (data) => {
        let config = data
        if (!data) {
            config = await Config.create({
                order_no: 1000,
            })
        }
        globalModuleConfig = {
            has_cms: config.has_cms || false,
            has_ecommerce: config.has_ecommerce || false,
            has_semnox: config.has_semnox || false,
            has_pam: config.has_pam || false,
            has_booknow: config.has_booknow || false,
        }
    })

app.get('/health', async (req, res) => {
    const appKey =
        process.env.APP_KEY === undefined ? 'APP Key is missing!!!' : 'OK'
    res.status(200).json({
        'DB Connected': dbSuccess,
        Health: 'OK',
        'App Key': appKey,
        Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        TimeNow: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    })
})

// BEGIN:: API Route Groups
const adminRoutes = require('./routes/admin/admin.routes')
const webAPIRoutes = require('./routes/api/web-api.routes')
const mobileAPIRoutes = require('./routes/api/mobile-api.routes')
// END:: API Route Groups

// TODO::Below code is only for continuos development purpose. Should be removed on staging and production
// BEGIN::Admin automatic auth on each server restart for development purpose
if (process.env.NODE_ENV == 'development') {
    const Settings = require('./model/Settings')
    const Admin = require('./model/Admin')
    const Brand = require('./model/Brand')
    const devAuth = async (req, res, next) => {
        if (!req.session?.selected_brand?._id) {
            const admin = await Admin.findOne()
            const brand = await Brand.findOne({ code: 'fc' })
                .populate({
                    path: 'languages',
                    options: { sort: { is_default: -1 } },
                })
                .populate('domains.country')

            if (brand) {
                session = req.session
                session.admin_id = admin._id
                session.admin_name = admin.name
                session.admin_role = admin.role
                const settings = await Settings.findOne({
                    brand: brand,
                    country: brand.domains[0].country._id,
                }).select(
                    '-brand -country -__v -created_at -updated_at -author'
                )

                session.selected_brand = {
                    _id: brand._id, //TODO: id should be _id for the consistency
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
            }
        }
        next()
    }
    app.use(devAuth)
}
// END::Admin aautomatic auth for development purpose

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
// Apply the rate limiting middleware to API calls only
app.use('/api', apiLimiter)

app.get('/', (req, res) => {
    return res.status(404).json('Not Found')
})
app.use('/app', mobileAPIRoutes)
app.use('/api', webAPIRoutes)
app.use(
    '/admin',
    [baseConfig, authUser, mainNavGenerator, allBrands],
    adminRoutes
)

module.exports = app
