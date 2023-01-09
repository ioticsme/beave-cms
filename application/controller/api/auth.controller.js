require('dotenv').config()
const Joi = require('joi')
const { joiPasswordExtendCore } = require('joi-password')
const joiPassword = Joi.extend(joiPasswordExtendCore)
const { authenticator } = require('otplib')
const bcrypt = require('bcrypt')
const { OAuth2Client } = require('google-auth-library')
const jwt = require('jsonwebtoken')
const formData = require('form-data')
const Mailgun = require('mailgun.js')
// const Content = require('../../node_modules/@ioticsme/cms/model/Content')
const User = require('../../model/User')
const UserResource = require('../../resources/api/user.resource')
const SMS = require('../../helper/SMS.helper')
const { saveCustomer } = require('../../helper/Semnox.helper')
const { sendEmail } = require('../../helper/Mail.helper')
const Product = require('../../model/Product')
const ProductResource = require('../../resources/api/product.resource')
const { verifyCaptcha } = require('../../helper/Captcha.helper')
const { getCache, setCache, removeCache } = require('../../helper/Redis.helper')
const { getRequestIp } = require('../../helper/Operations.helper')
const {
    parseISO,
    addMinutes,
    format,
    getUnixTime,
    isPast,
    isFuture,
} = require('date-fns')

const loginSubmit = async (req, res) => {
    const schema = Joi.object({
        email: Joi.string().email().required().max(60),
        password: Joi.string().required().min(4).max(20),
        token: Joi.string().optional().allow(null, ''),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    // Verifying captcha with token
    if (
        (process.env.NODE_ENV == 'production' ||
            process.env.NODE_ENV == 'staging') &&
        req.source == 'web'
    ) {
        const isVerified = await verifyCaptcha(req.body.token)
        if (!isVerified) {
            return res.status(400).json({ error: 'captcha token not verified' })
        }
    }

    try {
        let user = await User.findOne({
            email: req.body.email,
            active: true,
            isDeleted: false,
        })

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
            })
        }

        if (
            user.security_freezed_at &&
            isFuture(
                parseISO(
                    format(user.security_freezed_at, 'yyyy-MM-dd HH:mm:ss')
                )
            )
        ) {
            if (user.failed_attempt.login >= 5) {
                user.failed_attempt.login = 0
                await user.save()
            }

            return res.status(429).json({
                error: 'Your account is blocked for 5 minutes due to too Many failed Attempts.',
            })
        }

        if (bcrypt.compareSync(req.body.password, user.password)) {
            if (!user.semnox_user_id) {
                // save customer to semnox
                const save = await saveCustomer(
                    req.brand,
                    new UserResource(user).exec()
                )
                //updating user
                user = await User.findOneAndUpdate(
                    {
                        _id: user._id,
                    },
                    {
                        $set: {
                            semnox_user_id: save.Id,
                        },
                    },
                    {
                        new: true,
                    }
                )
            }

            let token
            if (!user.mobile_verified) {
                authenticator.options = {
                    digits: 8,
                    epoch: Date.now(),
                    step: 20000,
                }
                const otp = authenticator.generate(user.mobile)
                let smsSettings = req.brand.settings?.notification_settings?.sms
                SMS.sendOTP(otp, user.mobile, req.brand.name.en, smsSettings)
            } else {
                // Generate token
                token = jwt.sign(
                    {
                        data: {
                            user: new UserResource(user).exec(),
                            source: req.source,
                        },
                    },
                    process.env.APP_KEY,
                    {
                        expiresIn:
                            req.source == 'app'
                                ? `${
                                      process.env.MOBILE_USER_TOKEN_EXPIRY ||
                                      '15days'
                                  }`
                                : `${
                                      process.env.WEB_USER_TOKEN_EXPIRY || '24h'
                                  }`,
                    }
                )

                const ip = await getRequestIp(req)

                user.log.last_login = {
                    brand: req.brand.code,
                    country: req.country.code,
                    lang: req.language,
                    ip: ip,
                    user_agent: req.user_agent_data,
                }

                await removeCache([`user-${req.source}-auth-${user._id}`])
                if (token) {
                    setCache(
                        `user-${req.source}-auth-${user._id}`,
                        token,
                        60 *
                            60 *
                            24 *
                            (req.source == 'app'
                                ? process.env.MOBILE_USER_TOKEN_EXPIRY || 15
                                : 1)
                    )
                }
            }

            user.failed_attempt.login = 0
            user.failed_attempt.otp = 0
            user.security_freezed_at = undefined
            await user.save()

            res.status(200).json({
                user: new UserResource(user).exec(),
                token: token ? `Bearer ${token}` : undefined,
            })
            return
        } else {
            const attempt_count = user.failed_attempt.login + 1
            user.failed_attempt.login = attempt_count
            user.security_freezed_at =
                attempt_count >= 5 ? addMinutes(new Date(), 5) : null
            await user.save()
            return res.status(401).json({
                error: 'Unauthorized',
            })
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Something went wrong',
        })
    }
}

const socialLoginSubmit = async (req, res) => {
    const schema = Joi.object({
        provider: Joi.string().required().valid('facebook', 'google'),
        accessToken: Joi.string().required(),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }
    // const bearerToken = req.headers?.authorization?.split(' ')[1]
    const bearerToken = req.body.accessToken

    let profile = {}
    if (req.body.provider == 'facebook') {
        profile = await getFacebookProfile(bearerToken)
        console.log('FB: ', profile)
    }
    else if (req.body.provider == 'google') {
        profile = await getGoogleProfile(bearerToken)
        console.log('GP: ', profile)
    }

    if (!profile || !profile.email) {
        return res.status(401).json({
            error: 'Unauthorized',
        })
    }

    try {

        let user = await User.findOne({
            // email: { $regex: req.body.email, $options: 'i' },
            email: profile.email,
            active: true,
            // isDeleted: false,
        })

        const ip = await getRequestIp(req)

        if (!user) {
            // New User Create
            const saltRounds = 10
            const salt = bcrypt.genSaltSync(saltRounds)

            user = await User.create({
                first_name: profile.first_name,
                last_name: profile.last_name,
                email: profile.email,
                email_verified: profile.email_verified,
                // mobile: mobile,
                // consent_marketing:
                //     req.body.consent_marketing == 'true' || false,
                password: bcrypt.hashSync(`${profile.id}-${Date.now()}-${salt}`, salt),
                provider: req.body.provider,
                provider_user_id: profile.id,
                profile_image_url: profile.picture,
                log: {
                    last_login: {
                        brand: req.brand.code,
                        country: req.country.code,
                        lang: req.language,
                        ip: ip,
                        user_agent: req.user_agent_data,
                    },
                },
            })

            const featured_packages = ProductResource.collection(
                await Product.find({
                    brand: req.brand._id,
                    country: req.country._id,
                    product_type: 'regular',
                    featured: true,
                    published: true,
                })
                    .limit(4)
                    .sort('position')
                    .populate('country')
                    .select('name price image actual_price sales_price')
            )

            const promotions = await Content.find({
                type_slug: 'promotion',
            })
                .limit(4)
                .select('content')

            const mg_settings =
                req.brand.settings?.notification_settings?.mailgun
            sendEmail(
                mg_settings.from,
                req.body.email,
                `Thank you for Registering`,
                mg_settings.welcome_template,
                {
                    user: user,
                    packages: featured_packages,
                    promotions: promotions,
                },
                mg_settings
            )
        } else {
            user.first_name = profile.first_name
            user.last_name = profile.last_name
            user.email_verified = profile.email_verified
            user.provider = req.body.provider
            user.provider_user_id = profile.id
            user.profile_image_url = profile.picture

            user.log.last_login = {
                brand: req.brand.code,
                country: req.country.code,
                lang: req.language,
                ip: ip,
                user_agent: req.user_agent_data,
            }

            await user.save()
        }

        if (!user.mobile) {
            return res.status(206).json({
                message: 'Some fields are mandatory',
                fields: ['mobile', 'consent_marketing'],
            })
        }

        const token = jwt.sign(
            {
                data: {
                    user: new UserResource(user).exec(),
                    source: req.source,
                },
            },
            process.env.APP_KEY,
            {
                expiresIn:
                    req.source == 'app'
                        ? `${process.env.MOBILE_USER_TOKEN_EXPIRY || '15days'}`
                        : `${process.env.WEB_USER_TOKEN_EXPIRY || '24h'}`,
            }
        )

        await removeCache([`user-${req.source}-auth-${user._id}`])
        setCache(
            `user-${req.source}-auth-${user._id}`,
            token,
            60 *
                60 *
                24 *
                (req.source == 'app'
                    ? process.env.MOBILE_USER_TOKEN_EXPIRY || 15
                    : 1)
        )

        return res.status(200).json({
            user: new UserResource(user).exec(),
            token: token ? `Bearer ${token}` : undefined,
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: 'Something went wrong',
        })
    }
}

const getGoogleProfile = async (accessToken) => {
    try {
        const token = `Bearer ${accessToken}`
        const url = `https://www.googleapis.com/oauth2/v3/userinfo`
        const response = await axios
            .get(url, {
                headers: {
                    Authorization: token,
                },
            })
            .catch((error) => {
                console.log(error)
                return false
            })

        if (response && response.data && response.data.sub) {
            const profile = {
                id: response.data.sub,
                first_name: response.data.given_name,
                last_name: response.data.family_name,
                email: response.data.email,
                email_verified: response.data.email_verified,
                picture: response.data.picture,
            }
            return profile
        }
        return false
    } catch (error) {
        return false
    }
}

const getFacebookProfile = async (accessToken) => {
    try {
        const url = `https://graph.facebook.com/me?fields=id,name,email,picture,first_name,last_name&access_token=${accessToken}`
        const response = await axios.get(url)

        if (response && response.data && response.data.id) {
            const profile = {
                id: response.data.id,
                first_name: response.data.first_name,
                last_name: response.data.last_name,
                email: response.data.email,
                picture: response.data.picture?.data?.url,
            }
            return profile
        }
        return false
    } catch (error) {
        return false
    }
}

const updateMobileNo = async (req, res) => {
    const schema = Joi.object({
        provider: Joi.string().required().valid('facebook', 'google'),
        mobile: Joi.string()
            .custom((value, helper) => {
                // you can use any libs for check phone
                value = value.replace(/ /g, '')
                value = value.replace('+', '')
                console.log('VALUE', value)
                var regex = /^(971|973|968|965|974){1}]?[0-9]{8,9}$/
                if (!regex.test(value.replace(' ', ''))) {
                    return helper.message('Invalid phone number')
                }
                return value
            })
            // .regex(/^\+(?:[0-9] ?){6,14}[0-9]$/)
            .required()
            .min(11)
            .max(12),
        consent_marketing: Joi.boolean().optional().allow(null, ''),
        accessToken: Joi.string().optional().allow(null, ''),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        res.status(422).json({
            details: validationResult.error.details,
        })
        return
    }

    // Verifying captcha with token
    if (
        (process.env.NODE_ENV == 'production' ||
            process.env.NODE_ENV == 'staging') &&
        req.source == 'web'
    ) {
        const isVerified = await verifyCaptcha(req.body.token)
        if (!isVerified) {
            return res.status(400).json({ error: 'captcha token not verified' })
        }
    }

    try {
        const bearerToken = req.body.accessToken

    if (!bearerToken) {
        return res.status(401).json({
            error: 'Unauthorized',
        })
    }
    // console.log(bearerToken)
    let profile = {}
    if (req.body.provider == 'facebook') {
        profile = await getFacebookProfile(bearerToken)
        console.log('FB: ', profile)
    }
    else if (req.body.provider == 'google') {
        profile = await getGoogleProfile(bearerToken)
        console.log('GP: ', profile)
    }

    if (!profile || !profile.email) {
        return res.status(401).json({
            error: 'Unauthorized',
        })
    }

        // const CLIENT_ID_GOOGLE = process.env.GOOGLE_CLIENT_ID

        // const client = new OAuth2Client(CLIENT_ID_GOOGLE)

        // const socialAuthData = await client.verifyIdToken({
        //     idToken: bearerToken,
        //     audience: CLIENT_ID_GOOGLE,
        // })

        // if (!socialAuthData?.payload) {
        //     return res.status(401).json({
        //         error: 'Unauthorized',
        //     })
        // }

        let user = await User.findOne({
            email: profile.email,
            active: true,
            // isDeleted: false,
        })

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        let mobile = req.body.mobile.replace(/\D/g, '').replace(/^0+/, '')
        const isMobileExist = await User.findOne({ mobile })

        if (isMobileExist) {
            return res.status(422).json({
                details: [
                    {
                        message: '"mobile" number already exist',
                        path: ['mobile'],
                        type: 'any.exist',
                        context: {
                            label: 'mobile',
                            key: 'mobile',
                        },
                    },
                ],
            })
        }

        user.mobile = mobile
        user.consent_marketing = req.body.consent_marketing == 'true' || false
        await user.save()

        authenticator.options = {
            digits: 8,
            epoch: Date.now(),
            step: 20000,
        }
        const otp = authenticator.generate(mobile) //TODO Same OTP for same mobile number
        let smsSettings = req.brand.settings?.notification_settings?.sms
        SMS.sendOTP(otp, mobile, req.brand.name.en, smsSettings)

        return res.status(200).json({
            message: 'OTP sent to mobile ',
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const signupSubmit = async (req, res) => {
    const schema = Joi.object({
        first_name: Joi.string()
            .regex(/^[,. a-zA-Z]+$/)
            .required()
            .min(3)
            .max(20)
            .messages({
                'string.pattern.base':
                    'First Name should contain only alphabets',
            }),
        last_name: Joi.string()
            .regex(/^[,. a-zA-Z]+$/)
            .required()
            .min(3)
            .max(20)
            .messages({
                'string.pattern.base':
                    'Last Name should contain only alphabets',
            }),
        email: Joi.string().email().required().max(60),
        mobile: Joi.string().required().min(7).max(15),
        password: joiPassword
            .string()
            .minOfSpecialCharacters(1)
            .minOfLowercase(1)
            .minOfUppercase(1)
            .minOfNumeric(1)
            .noWhiteSpaces()
            .required()
            .min(8)
            .max(20),
        consent_marketing: Joi.boolean().optional().allow(null, ''),
        confirm_password: Joi.any()
            .valid(Joi.ref('password'))
            .required()
            .messages({
                'any.only': 'password and confirm password must be same',
            }),
        token: Joi.string().optional().allow(null, ''),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        res.status(422).json({
            details: validationResult.error.details,
        })
        return
    }

    // Verifying captcha with token
    if (
        process.env.NODE_ENV == 'production' ||
        process.env.NODE_ENV == 'staging'
    ) {
        const isVerified = await verifyCaptcha(req.body.token)
        if (!isVerified) {
            return res.status(400).json({ error: 'captcha token not verified' })
        }
    }

    try {
        let mobile = req.body.mobile.replace(/\D/g, '').replace(/^0+/, '')
        const isMobileExist = await User.findOne({ mobile })
        const isEmailExist = await User.findOne({ email: req.body.email })

        if (isMobileExist) {
            return res.status(422).json({
                details: [
                    {
                        message: '"mobile" is already exist',
                        path: ['mobile'],
                        type: 'any.exist',
                        context: {
                            label: 'mobile',
                            key: 'mobile',
                        },
                    },
                ],
            })
        }

        if (isEmailExist) {
            return res.status(422).json({
                details: [
                    {
                        message: '"email" is already exist',
                        path: ['email'],
                        type: 'any.exist',
                        context: {
                            label: 'email',
                            key: 'email',
                        },
                    },
                ],
            })
        }

        const saltRounds = 10
        const salt = bcrypt.genSaltSync(saltRounds)

        const ip = await getRequestIp(req)

        const user = await User.create({
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            mobile: mobile,
            consent_marketing: req.body.consent_marketing == 'true' || false,
            password: bcrypt.hashSync(req.body.password, salt),
            log: {
                signup: {
                    brand: req.brand.code,
                    country: req.country.code,
                    lang: req.language,
                    ip: ip,
                    user_agent: req.user_agent_data,
                },
            },
        })

        if (!user?._id) {
            return res
                .status(400)
                .json({ error: 'Not able to update user details' })
        }

        const featured_packages = ProductResource.collection(
            await Product.find({
                brand: req.brand._id,
                country: req.country._id,
                product_type: 'regular',
                featured: true,
                published: true,
            })
                .limit(4)
                .sort('position')
                .populate('country')
                .select('name price image actual_price sales_price')
        )

        const prmotions = await Content.find({
            type_slug: 'promotion',
        })
            .limit(4)
            .select('content')
        let mg_settings = req.brand.settings?.notification_settings?.mailgun
        sendEmail(
            mg_settings.from,
            req.body.email,
            `Thank you for Registering`,
            mg_settings.welcome_template,
            {
                user: user,
                packages: featured_packages,
                promotions: prmotions,
            },
            mg_settings
        )

        authenticator.options = {
            digits: 8,
            epoch: Date.now(),
            step: 20000,
        }
        const otp = authenticator.generate(mobile)
        let smsSettings = req.brand.settings?.notification_settings?.sms
        SMS.sendOTP(otp, mobile, req.brand.name.en, smsSettings)

        return res.status(200).json({
            message: 'OTP sent to mobile ',
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const otpVerification = async (req, res) => {
    const schema = Joi.object({
        mobile: Joi.string().required().min(7).max(15),
        otp: Joi.string().required().min(8).max(8),
        token: Joi.string().optional().allow(null, ''),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    // Verifying captcha with token
    if (
        process.env.NODE_ENV == 'production' ||
        process.env.NODE_ENV == 'staging'
    ) {
        const isVerified = await verifyCaptcha(req.body.token)
        if (!isVerified) {
            return res.status(400).json({ error: 'captcha token not verified' })
        }
    }

    try {
        const otp = req.body.otp
        const mobile = req.body.mobile

        const user = await User.findOne({
            mobile: req.body.mobile,
            active: true,
            isDeleted: false,
        })

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        if (
            user?.security_freezed_at &&
            isFuture(
                parseISO(
                    format(user?.security_freezed_at, 'yyyy-MM-dd HH:mm:ss')
                )
            )
        ) {
            return res.status(429).json({
                error: 'Your account is blocked for 5 minutes due to too Many failed Attempts.',
            })
        }
        // verifying OTP
        const isValid = await authenticator.check(otp, mobile)
        // If otp verified
        if (isValid) {
            const user = await User.findOne({ mobile })
            // save customer to semnox
            const save = await saveCustomer(
                req.brand,
                new UserResource(user).exec()
            )
            if (!save?.Id) {
                return res
                    .status(400)
                    .json({ error: 'Customer not regitered to semnox' })
            }
            //updating user
            const update = await User.findOneAndUpdate(
                {
                    mobile,
                },
                {
                    $set: {
                        failed_attempt: {
                            otp: 0,
                        },
                        semnox_user_id: save.Id,
                        mobile_verified: true,
                        active: true,
                    },
                },
                {
                    new: true,
                }
            )
            if (!update?._id) {
                return res
                    .status(400)
                    .json({ error: 'Unable to update user details' })
            }
            // Generate token
            const token = jwt.sign(
                {
                    data: {
                        user: new UserResource(update).exec(),
                        source: req.source,
                    },
                },
                process.env.APP_KEY,
                {
                    expiresIn:
                        req.source == 'app'
                            ? process.env.MOBILE_USER_TOKEN_EXPIRY
                            : process.env.WEB_USER_TOKEN_EXPIRY || '24h',
                }
            )

            await removeCache([`user-web-auth-${user._id}`])
            if (token) {
                setCache(`user-web-auth-${user._id}`, token, 60 * 60 * 24)
            }

            return res.status(200).json({
                user: new UserResource(update).exec(),
                token: `Bearer ${token}`,
            })
        } else {
            const attempt_count = (user?.failed_attempt?.otp || 0) + 1
            user.failed_attempt.otp = attempt_count
            user.security_freezed_at =
                attempt_count >= 5 ? addMinutes(new Date(), 5) : null
            await user.save()
            return res.status(422).json({
                details: [
                    {
                        message: '"OTP" is invalid',
                        path: ['otp'],
                        type: 'any.invalid',
                        context: {
                            label: 'otp',
                            key: 'otp',
                        },
                    },
                ],
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const resendOTP = async (req, res) => {
    const schema = Joi.object({
        mobile: Joi.string().required().min(7).max(15),
        token: Joi.string().optional().allow(null, ''),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    // Verifying captcha with token
    if (
        process.env.NODE_ENV == 'production' ||
        process.env.NODE_ENV == 'staging'
    ) {
        const isVerified = await verifyCaptcha(req.body.token)
        if (!isVerified) {
            return res.status(400).json({ error: 'captcha token not verified' })
        }
    }

    try {
        let mobile = req.body.mobile.replace(/\D/g, '').replace(/^0+/, '')

        const user = await User.findOne({
            mobile: req.body.mobile,
            active: true,
            isDeleted: false,
        })

        if (!user) {
            return res.status(200).json({
                message: 'OTP sent to mobile ',
            })
        }

        if (
            user &&
            user?.security_freezed_at &&
            isFuture(
                parseISO(
                    format(user?.security_freezed_at, 'yyyy-MM-dd HH:mm:ss')
                )
            )
        ) {
            return res.status(429).json({
                error: 'Your account is blocked for 5 minutes due to too Many Attempts.',
            })
        }

        if (
            user &&
            user?.otp_freez_until &&
            isFuture(
                parseISO(format(user?.otp_freez_until, 'yyyy-MM-dd HH:mm:ss'))
            )
        ) {
            return res.status(429).json({
                error: 'OTP is already sent',
            })
        }

        authenticator.options = {
            digits: 8,
            epoch: Date.now(),
            step: 20000,
        }
        const otp = authenticator.generate(mobile)
        let smsSettings = req.brand.settings?.notification_settings?.sms
        SMS.sendOTP(otp, mobile, req.brand.name.en, smsSettings)
        await User.findOneAndUpdate(
            {
                mobile: req.body.mobile,
            },
            {
                $set: {
                    otp_freez_until: addMinutes(new Date(), 1),
                },
            },
            {
                new: true,
            }
        )
        return res.status(200).json({
            message: 'OTP sent to mobile ',
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const forgotCredentials = async (req, res) => {
    const schema = Joi.object({
        auth_key: Joi.string().required().min(7),
        token: Joi.string().optional().allow(null, ''),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json({
            details: validationResult.error.details,
        })
    }

    // Verifying captcha with token
    if (
        process.env.NODE_ENV == 'production' ||
        process.env.NODE_ENV == 'staging'
    ) {
        const isVerified = await verifyCaptcha(req.body.token)
        if (!isVerified) {
            return res.status(400).json({ error: 'captcha token not verified' })
        }
    }

    try {
        let isEmail = false
        let isMobile = false

        // Check whether the input is email or mobile
        const validateEmail = (email) => {
            const test = String(email)
                .toLowerCase()
                .match(
                    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                )
            return test
        }
        const validatePhone = (phone) => {
            let value = phone.replace(/\D/g, '').replace(/^0+/, '')
            const test = value.match(
                /([+]?\d{1,2}[.-\s]?)?(\d{3}[.-]?){2}\d{4}/
            )
            return test
        }
        if (validateEmail(req.body.auth_key)) {
            isEmail = true
        } else if (validatePhone(req.body.auth_key)) {
            isMobile = true
        } else {
            return res.status(422).json({
                details: [
                    {
                        message: 'invalid data',
                        context: {
                            label: 'value',
                            value: req.body.auth_key,
                            key: 'value',
                        },
                    },
                ],
            })
        }

        let user
        if (isEmail) {
            user = await User.findOne({
                email: req.body.auth_key,
                active: true,
            })
        } else if (isMobile) {
            let value = req.body.auth_key.replace(/\D/g, '').replace(/^0+/, '')
            user = await User.findOne({ mobile: value, active: true })
        }
        if (!user) {
            return res.status(200).json({
                message: `You will receive an OTP on your ${
                    isEmail ? 'Email' : 'Mobile'
                } if its registered with us.`,
            })
        }

        if (
            user &&
            user.security_freezed_at &&
            isFuture(
                parseISO(
                    format(user.security_freezed_at, 'yyyy-MM-dd HH:mm:ss')
                )
            )
        ) {
            return res.status(429).json({
                error: 'Your account is blocked for 5 minutes due to too Many Attempts.',
            })
        }

        if (
            user &&
            user.otp_freez_until &&
            isFuture(
                parseISO(format(user.otp_freez_until, 'yyyy-MM-dd HH:mm:ss'))
            )
        ) {
            return res.status(429).json({
                error: 'OTP is already sent',
            })
        }

        // Generating OTP
        authenticator.options = {
            digits: 8,
            epoch: Date.now(),
            step: 20000,
        }
        const otp = authenticator.generate(req.body.auth_key)
        // IF auth_key is email otp send via email o.w send via sms
        if (isEmail) {
            // BEGIN:: Sending Email
            let mg_settings = req.brand.settings?.notification_settings?.mailgun
            sendEmail(
                mg_settings.from,
                req.body.auth_key,
                `OTP for resetting your password is ${otp}`,
                mg_settings.forgot_password_template,
                {
                    otp: otp,
                },
                mg_settings
            )
        } else if (isMobile) {
            let mobile = req.body.auth_key.replace(/\D/g, '').replace(/^0+/, '')
            let smsSettings = req.brand.settings?.notification_settings?.sms
            SMS.sendOTP(otp, mobile, req.brand.name.en, smsSettings)
        }

        user.otp_freez_until = addMinutes(new Date(), 1)
        await user.save()

        return res.status(200).json({
            message: `You will receive an OTP on your ${
                isEmail ? 'Email' : 'Mobile'
            } if its registered with us.`,
        })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const verifyForgotOTP = async (req, res) => {
    const schema = Joi.object({
        auth_key: Joi.string().required().min(7),
        otp: Joi.string().required().min(8).max(8),
        password: joiPassword
            .string()
            .minOfSpecialCharacters(1)
            .minOfLowercase(1)
            .minOfUppercase(1)
            .minOfNumeric(1)
            .noWhiteSpaces()
            .required()
            .min(8)
            .max(20),
        confirm_password: Joi.any()
            .valid(Joi.ref('password'))
            .required()
            .messages({
                'any.only': 'password and confirm password must be same',
            }),
        token: Joi.string().optional().allow(null, ''),
    })

    const validationResult = schema.validate(req.body, { abortEarly: false })

    if (validationResult.error) {
        return res.status(422).json(validationResult.error)
    }

    // Verifying captcha with token
    if (
        process.env.NODE_ENV == 'production' ||
        process.env.NODE_ENV == 'staging'
    ) {
        const isVerified = await verifyCaptcha(req.body.token)
        if (!isVerified) {
            return res.status(400).json({ error: 'captcha token not verified' })
        }
    }

    try {
        let isEmail = false
        let isMobile = false
        // checking the input type
        const validateEmail = (email) => {
            const test = String(email)
                .toLowerCase()
                .match(
                    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                )
            return test
        }
        const validatePhone = (phone) => {
            let value = phone.replace(/\D/g, '').replace(/^0+/, '')
            const test = value.match(
                /([+]?\d{1,2}[.-\s]?)?(\d{3}[.-]?){2}\d{4}/
            )
            return test
        }
        if (validateEmail(req.body.auth_key)) {
            isEmail = true
        } else if (validatePhone(req.body.auth_key)) {
            isMobile = true
        } else {
            return res.status(422).json({
                _original: req.body,
                details: [
                    {
                        message: 'invalid data',
                        context: {
                            label: 'value',
                            value: req.body.auth_key,
                            key: 'value',
                        },
                    },
                ],
            })
        }
        const otp = req.body.otp
        const auth_key = req.body.auth_key
        // verifying OTP
        const isValid = await authenticator.check(otp, auth_key)
        // If otp verified
        if (isValid) {
            let user
            if (isEmail) {
                user = await User.findOne({ email: req.body.auth_key })
            } else if (isMobile) {
                let value = req.body.auth_key
                    .replace(/\D/g, '')
                    .replace(/^0+/, '')
                user = await User.findOne({ mobile: value })
            }
            if (!user) {
                return res.status(404).json({ error: 'User not found' })
            }

            const saltRounds = 10
            const salt = bcrypt.genSaltSync(saltRounds)

            //updating user password
            user.failed_attempt.login = 0
            user.failed_attempt.otp = 0
            user.password = bcrypt.hashSync(req.body.password, salt)
            await user.save()

            // if (!update?._id) {
            //     return res.status(400).json({ error: 'Password not updated' })
            // }

            // IF auth_key is email otp send via email o.w send via sms
            if (isEmail) {
                // BEGIN:: Sending Email
                let mg_settings =
                    req.brand.settings?.notification_settings?.mailgun
                sendEmail(
                    mg_settings.from,
                    req.body.auth_key,
                    `Your password has been reset`,
                    mg_settings.forgot_password_thankyou_template,
                    {
                        brand: req.brand.name.en,
                    },
                    mg_settings
                )
            } else if (isMobile) {
                let mobile = req.body.auth_key
                    .replace(/\D/g, '')
                    .replace(/^0+/, '')
                let message = `Your password is reset`
                let smsSettings = req.brand.settings?.notification_settings?.sms
                SMS.sendThanks(message, mobile, req.brand.name.en, smsSettings)
            }

            return res.status(200).json({
                message: 'Password is reset',
                user: new UserResource(user).exec(),
            })
        } else {
            await User.findOneAndUpdate(
                {
                    $or: [
                        { mobile: req.body.auth_key },
                        { email: req.body.auth_key },
                    ],
                },
                {
                    $inc: {
                        'failed_attempt.otp': 1,
                    },
                },
                {
                    new: true,
                }
            )
            return res.status(422).json({
                details: [
                    {
                        message: '"OTP" is invalid',
                        path: ['otp'],
                        type: 'any.invalid',
                        context: {
                            label: 'otp',
                            key: 'otp',
                        },
                    },
                ],
            })
        }
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const logout = async (req, res) => {
    await removeCache([`user-web-auth-${req.authPublicUser._id}`])
    return res.status(200).json({
        message: 'success',
    })
}

module.exports = {
    loginSubmit,
    socialLoginSubmit,
    signupSubmit,
    updateMobileNo,
    otpVerification,
    resendOTP,
    forgotCredentials,
    verifyForgotOTP,
    logout,
}
