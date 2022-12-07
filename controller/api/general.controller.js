const { optionalRequire } = require("optional-require");

const Menu = optionalRequire('../../node_modules/@ioticsme/cms/model/Menu')
const MenuResource = require('../../resources/api/menu.resource')

// Menu
const menuList = async (req, res) => {
    try {
        const menus = await Menu.find({
            'nav_items.active': true,
            brand: req.brand,
            country: req.country,
            nav_position: req.query?.type,
        })
        res.status(200).json(MenuResource.collection(menus))
    } catch (error) {
        res.status(404).json('Not found')
    }
}

const brandingDetail = async (req, res) => {
    // console.log(req.brand)
    try {
        // const menus = await Menu.find({
        //     'nav_items.active': true,
        //     nav_position: req.query?.type,
        // })
        res.status(200).json(req.brand)
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const navList = async (req, res) => {
    try {
        res.status(200).json({
            navigation: req.navigation,
        })
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

module.exports = {
    menuList,
    brandingDetail,
    navList,
}
