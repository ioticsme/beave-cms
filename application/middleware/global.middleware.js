require('dotenv').config()
var session = require('express-session')

// const checkHasCMS = (req, res, next) => {
//     if (!globalModuleConfig.has_cms) {
//         // console.log(req.headers['content-type'])
//         if(req.headers['content-type'] == 'application/json') {
//             return res.status(404).json(`Not found`)
//         }
//         return res.render(`admin/error-404`)
//     }
//     next()
// }

// const checkHasEcom = (req, res, next) => {
//     if (!globalModuleConfig.has_ecommerce) {
//         if(req.headers['content-type'] == 'application/json') {
//             return res.status(404).json(`Not found`)
//         }
//         return res.render(`admin/error-404`)
//     }
//     next()
// }

module.exports = {
    // checkHasCMS,
    // checkHasEcom,
}
