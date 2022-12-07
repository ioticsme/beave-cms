require('dotenv').config()
const Media = require('../../model/Media')

const list = async (req, res) => {
    try {
        const media = await Media.find()
        return res.render('admin/cms/media/listing', { media })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

module.exports = {
    list,
}
