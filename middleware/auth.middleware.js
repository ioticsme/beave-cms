require('dotenv').config()
// const jwt = require('jsonwebtoken');
// const User = require("../db/models/user");

const authCheck = async (req, res, next) => {
    if (!req.session || !req.session.admin_id) {
        res.redirect('/admin/auth/login')
        return
    }

    req.authUser = req.session
    next()
}

module.exports = authCheck
