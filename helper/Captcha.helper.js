require('dotenv').config()
const axios = require('axios')

const verifyCaptcha = async (token) => {
    try {
        let response = await axios
            .post(
                `${process.env.CAPTCHA_BASE_URL}?secret=${process.env.CAPTCHA_SECRET_KEY}&response=${token}`
            )
            .then((res) => {
                // console.log(res.data)
                return res?.data?.success
            })
            .catch((err) => {
                console.log(err)
                return false
            })
        return response
    } catch (error) {
        return false
    }
}

module.exports = {
    verifyCaptcha,
}
