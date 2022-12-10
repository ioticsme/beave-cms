const ContentType = require('../model/ContentType')

const contentTypeCheck = async (req, res, next) => {
    if (!req.params.contentType) {
        res.json('Not Found')
        return
    }
    try {
        const contentType = await ContentType.findOne({
            slug: req.params.contentType,
        })
        req.contentType = contentType
    } catch (err) {
        res.json('Not Found')
        return
    }

    next()
}

module.exports = contentTypeCheck
