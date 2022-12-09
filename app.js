require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const Sentry = require('@sentry/node')
const Tracing = require('@sentry/tracing')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
var session = require('express-session')
const redis = require('redis');
var redisStore = require('connect-redis')(session);

const fs = require('fs')
const path = require('path')
var cors = require('cors')
var createError = require('http-errors')
const app = express()
const rateLimit = require('express-rate-limit')
const { format } = require('date-fns')

Sentry.init({
    dsn: 'https://03d85f2d0d9f4c7ea8c975339b54ae0f@o437096.ingest.sentry.io/4503935390253056',
    integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ app }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
})
// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler())
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler())

global.globalModuleConfig = {
    has_ecommerce: process.env.HAS_ECOMMERCE == 'true' ? true : false,
    has_semnox: process.env.HAS_SEMNOX == 'true' ? true : false,
    has_pam: process.env.HAS_PAM == 'true' ? true : false,
    // has_cms: true,
}
if (fs.existsSync('./node_modules/@ioticsme/cms/index.js')) {
    global.globalModuleConfig.has_cms = true
} else {
    global.globalModuleConfig.has_cms = false
}



// BEGIN::Service Providers
const ServiceProvider = require('./services/AppServiceProvider')
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
app.use(express.static('public'))


//Configure redis client

var client  = redis.createClient({legacyMode: true});

(async () => {
    client.on('error', (err) => {console.log('Redis Client Error', err);});
    await client.connect();
})();

const sessionConfig = {
    store: new redisStore({ host: 'localhost', port: 6379, client: client,ttl :  260}),
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
    app.set('trust proxy', 1);
}
// sessionConfig.store = new RedisStore({ host: 'localhost', port: 6379, client: redisClient,ttl :  260}),

app.use(
    session(sessionConfig)
)

// console.log('SESSION STARTED')

app.use(cookieParser())

app.use(ServiceProvider.baseConfig)
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

app.get('/health', async (req, res) => {
    const appKey =
        process.env.APP_KEY === undefined ? 'APP Key is missing!!!' : 'OK'

    const envCheck = () => {
        if (
            process.env.PAYFORT_URL === undefined ||
            process.env.MERCHANT_IDENTIFIER === undefined ||
            process.env.ACCESS_CODE === undefined ||
            process.env.SHA_REQUEST_PARSE === undefined ||
            process.env.SHA_RESPONSE_PARSE === undefined ||
            process.env.SHA_TYPE === undefined
        ) {
            return 'Payment Gateway Config is missing'
        } else {
            return 'OK'
        }
    }
    res.status(200).json({
        'DB Connected': dbSuccess,
        Health: 'OK',
        'App Key': appKey,
        'Payment Gateway Config': envCheck(),
        Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        TimeNow: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    })
})

// BEGIN:: API Route Groups
const adminRoutes = require('./routes/admin/admin.routes')
const webAPIRoutes = require('./routes/api/web-api.routes')
const mobileAPIRoutes = require('./routes/api/mobile-api.routes')
// END:: API Route Groups

// app.use('/', async(req, res) => {
//     res.json('redirect to dashboard')
// })

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

// BEGIN::Main Nav Generator (Global)
app.use(ServiceProvider.authUser)
app.use(ServiceProvider.mainNavGenerator)
app.use(ServiceProvider.allBrands)
// END::Main Nav Generator (Global)

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
app.use('/admin', adminRoutes)

// try{
//     const superAdminRoutes = require('./node_modules/@ioticsme/cms-installer/dist/routes/super_admin.routes')
//     app.use('/superadmin', superAdminRoutes)
// }catch(e){}

// app.use('/payment', paymentRoutes) 

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message
    if (req.app.get('env') === 'development') {
        console.log(err.message)
    }
    res.locals.error = req.app.get('env') === 'development' ? err : {}
    // render the error page
    res.status(err.status || 500)
    res.render(`admin/error-${err.status || 500}`)
})

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler())

// Sentry.captureException(new Error('Good bye'));

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500
    console.log(err)
    res.end(res.sentry + '\n')
    // res.end('\n')
})

const port = process.env.PORT || 8080

app.listen(port, async () => {
    console.log(`App running in port ${port}`)
}).on('error', () => {
    console.log('Application error')
})
