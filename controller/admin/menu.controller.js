require('dotenv').config()
const Joi = require('joi')
const _ = require('lodash')
const Menu = require('../../model/Menu')
const collect = require('collect.js')
const { Types } = require('mongoose')

const listMenu = async (req, res) => {
    try {
        const menus = await Menu.find({
            brand: req.authUser?.selected_brand?._id,
            country: req.authUser?.selected_brand?.country,
        }).sort({ position: 1 })
        res.render(`admin/cms/menu/listing`, { menulist: menus })
    } catch (e) {
        console.log(e)
        return res.render(`admin/error-404`)
    }
}

const addMenu = async (req, res) => {
    try {
        session = req.authUser
        let labelValidationObj = {}
        let pathValidationObj = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(labelValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
            _.assign(pathValidationObj, {
                [lang.prefix]: eval(`Joi.string().required()`),
            })
        })
        const schema = Joi.object({
            label: Joi.object({
                ...labelValidationObj,
            }),
            path: Joi.object({
                ...pathValidationObj,
            }),
            external: Joi.string().allow('', null, 'true'),
            menu_position: Joi.string().required(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            res.status(422).json(validationResult.error)
            return
        }
        // Form data
        let body = req.body
        let label = {}
        let path = {}
        req.authUser.selected_brand.languages.forEach((lang) => {
            _.assign(label, {
                [lang.prefix]: body.label[lang.prefix],
            })
            _.assign(path, {
                [lang.prefix]: body.path[lang.prefix],
            })
        })

        // object to insert
        const obj = {
            _id: Types.ObjectId(),
            label,
            url: {
                ...path,
                external: body.external == 'true',
            },
        }
        // Push the obj to nav_items
        const update = await Menu.findOneAndUpdate(
            {
                nav_position: body.menu_position,
                brand: req.authUser?.selected_brand?._id,
                country: req.authUser?.selected_brand?.country,
            },
            {
                $push: {
                    nav_items: obj,
                },
            }
        )
        // If menu position not found
        if (!update?._id) {
            return res
                .status(400)
                .json({ error: 'Select a valid Menu position' })
        }

        return res.status(200).json({
            message: `New Menu added`,
            item: update,
        })
    } catch (error) {
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

const editMenu = async (req, res) => {
    try {
        let { position, id, level } = req.params
        // Findong all menis from DB
        const menus = await Menu.find({
            brand: req.authUser?.selected_brand?._id,
            country: req.authUser?.selected_brand?.country,
        }).sort({ position: 1 })
        // Finding menu with menu position
        const menuDetail = menus.find((menu) => menu.nav_position == position)
        let menuItem = {}
        // Finding menu item w.r.t the menu child level
        if (menuDetail?._id) {
            if (level == '0') {
                menuItem = menuDetail.nav_items.find(
                    (item) => item._id.toString() == id
                )
            } else if (level == '1') {
                let parentIndex = req.query?.parent_index
                menuItem = menuDetail.nav_items[parentIndex].child.find(
                    (item) => item._id.toString() == id
                )
                if (menuItem) menuItem.parent_index = req.query.parent_index
            } else if (level == '2') {
                let parentIndex = req.query?.parent_index
                let secParentIndex = req.query?.sec_parent_index
                menuItem = menuDetail.nav_items[parentIndex].child[
                    secParentIndex
                ].child.find((item) => item._id.toString() == id)
                if (menuItem) {
                    menuItem.parent_index = req.query.parent_index
                    menuItem.sec_parent_index = req.query.sec_parent_index
                }
            }
        }
        // add level value to menuItem
        if (menuItem?._id) menuItem.level = level
        res.render(`admin/cms/menu/edit-form`, {
            menulist: menus,
            navPosition: position,
            menuItem: menuItem ? menuItem : {},
        })
    } catch (error) {
        // console.log(error)
        return res.render(`admin/error-404`)
    }
}

const saveEditMenu = async (req, res) => {
    try {
        const schema = Joi.object({
            id: Joi.string().required(),
            level: Joi.string().required(),
            parent_index: Joi.optional(),
            sec_parent_index: Joi.optional(),
            label: Joi.object({
                en: Joi.string().required(),
                ar: Joi.string().required(),
            }),
            path: Joi.object({
                en: Joi.string().required(),
                ar: Joi.string().required(),
            }),
            external: Joi.string().allow('', null, 'true'),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json(validationResult.error)
        }
        // Destructuring values from req.body
        const { id, level } = req.body
        const { position } = req.params

        let update
        let body = req.body
        // Checking the level of the child
        if (level == '0') {
            // Find menu with position
            // FInding the menu item with child level and index of the menu item in child array
            // After finding delete the menu item from the child array then push the new menu item to the index position
            const menu = await Menu.findOne({
                brand: req.authUser?.selected_brand?._id,
                country: req.authUser?.selected_brand?.country,
                nav_position: position,
            })
            let menuItem = {}
            let menuIndex = 0
            if (menu?._id) {
                menuItem = menu.nav_items.find(
                    (item) => item._id.toString() == id
                )
                menuIndex = menu.nav_items.findIndex(
                    (item) => item._id.toString() == id
                )
            }
            let obj = {
                _id: id,
                label: req.body.label,
                url: {
                    ...req.body.path,
                    external: req.body.external == 'true',
                },
                child: menuItem.child,
            }
            let deleteItem = await Menu.findOneAndUpdate(
                {
                    brand: req.authUser?.selected_brand?._id,
                    country: req.authUser?.selected_brand?.country,
                    nav_position: position,
                },
                {
                    $pull: {
                        nav_items: {
                            _id: id,
                        },
                    },
                }
            )
            if (!deleteItem?._id) {
                return res.status(400).json({ error: 'Something went wrong' })
            }

            update = await Menu.findOneAndUpdate(
                {
                    nav_position: position,
                    brand: req.authUser?.selected_brand?._id,
                    country: req.authUser?.selected_brand?.country,
                    'nav_items.$._id': id,
                },
                {
                    $push: {
                        nav_items: { $each: [obj], $position: menuIndex },
                    },
                },
                {
                    new: true,
                }
            )
        } else if (level == '1') {
            const menu = await Menu.findOne({
                nav_position: position,
                brand: req.authUser?.selected_brand?._id,
                country: req.authUser?.selected_brand?.country,
            })
            let menuItem = {}
            let menuIndex
            if (menu?._id) {
                menuItem = menu.nav_items[body.parent_index].child.find(
                    (item) => item._id.toString() == id
                )
                menuIndex = menu.nav_items[body.parent_index].child.findIndex(
                    (item) => item._id.toString() == id
                )
            }

            let obj = {
                _id: id,
                label: req.body.label,
                url: {
                    ...req.body.path,
                    external: req.body.external == 'true',
                },
                child: menuItem.child,
            }
            let deleteItem = await Menu.findOneAndUpdate(
                {
                    nav_position: position,
                    brand: req.authUser?.selected_brand?._id,
                    country: req.authUser?.selected_brand?.country,
                },
                {
                    $pull: {
                        [`nav_items.$[].child`]: {
                            _id: id,
                        },
                    },
                }
            )
            if (!deleteItem?._id) {
                return res.status(400).json({ error: 'Something went wrong' })
            }

            update = await Menu.findOneAndUpdate(
                {
                    nav_position: position,
                    brand: req.authUser?.selected_brand?._id,
                    country: req.authUser?.selected_brand?.country,
                    [`nav_items.${body.parent_index}.child.$._id`]: id,
                },
                {
                    $push: {
                        [`nav_items.${body.parent_index}.child`]: {
                            $each: [obj],
                            $position: menuIndex,
                        },
                    },
                },
                {
                    new: true,
                }
            )
        } else if (level == '2') {
            const menu = await Menu.findOne({
                nav_position: position,
                brand: req.authUser?.selected_brand?._id,
                country: req.authUser?.selected_brand?.country,
            })
            let menuItem = {}
            let menuIndex
            if (menu?._id) {
                menuItem = menu.nav_items[body.parent_index].child[
                    body.sec_parent_index
                ].child.find((item) => item._id.toString() == id)
                menuIndex = menu.nav_items[body.parent_index].child[
                    body.sec_parent_index
                ].child.findIndex((item) => item._id.toString() == id)
            }

            let obj = {
                _id: id,
                label: req.body.label,
                url: {
                    ...req.body.path,
                    external: req.body.external == 'true',
                },
                child: menuItem.child,
            }
            let deleteItem = await Menu.findOneAndUpdate(
                {
                    nav_position: position,
                    brand: req.authUser?.selected_brand?._id,
                    country: req.authUser?.selected_brand?.country,
                },
                {
                    $pull: {
                        [`nav_items.$[].child.$[].child`]: {
                            _id: id,
                        },
                    },
                }
            )
            if (!deleteItem?._id) {
                return res.status(400).json({ error: 'Something went wrong' })
            }

            update = await Menu.findOneAndUpdate(
                {
                    nav_position: position,
                    brand: req.authUser?.selected_brand?._id,
                    country: req.authUser?.selected_brand?.country,
                    [`nav_items.${body.parent_index}.child.${body.sec_parent_index}.child.$._id`]:
                        id,
                },
                {
                    $push: {
                        [`nav_items.${body.parent_index}.child.${body.sec_parent_index}.child`]:
                            { $each: [obj], $position: menuIndex },
                    },
                },
                {
                    new: true,
                }
            )
        }

        // If menu  not found
        if (!update?._id) {
            return res.status(400).json({ error: 'Select a valid Menu ' })
        }

        return res.status(200).json({
            message: `Menu updated`,
        })
    } catch (error) {
        // console.log(error)
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

const deleteMenu = async (req, res) => {
    try {
        const schema = Joi.object({
            id: Joi.string().required(),
            nav_position: Joi.string().required(),
            level: Joi.string().required(),
        })

        const validationResult = schema.validate(req.body, {
            abortEarly: false,
        })

        if (validationResult.error) {
            return res.status(422).json({ error: 'Something went wrong' })
        }
        // Destructuring values from req.body
        const { id, nav_position, level } = req.body

        let update
        // Checking the level of the child
        if (level == '0') {
            update = await Menu.findOneAndUpdate(
                {
                    nav_position,
                    brand: req.authUser?.selected_brand?._id,
                    country: req.authUser?.selected_brand?.country,
                },
                {
                    $pull: {
                        nav_items: {
                            _id: id,
                        },
                    },
                }
            )
        } else if (level == '1') {
            update = await Menu.findOneAndUpdate(
                {
                    nav_position,
                    brand: req.authUser?.selected_brand?._id,
                    country: req.authUser?.selected_brand?.country,
                },
                {
                    $pull: {
                        [`nav_items.$[].child`]: {
                            _id: id,
                        },
                    },
                }
            )
        } else if (level == '2') {
            update = await Menu.findOneAndUpdate(
                {
                    nav_position,
                    brand: req.authUser?.selected_brand?._id,
                    country: req.authUser?.selected_brand?.country,
                },
                {
                    $pull: {
                        [`nav_items.$[].child.$[].child`]: {
                            _id: id,
                        },
                    },
                }
            )
        }
        // If menu  not found
        if (!update?._id) {
            return res.status(400).json({ error: 'Select a valid Menu ' })
        }

        return res.status(200).json({
            message: `Menu deleted`,
        })
    } catch (error) {
        console.log('error :>> ', error);
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

// Handle position change of menu items
const saveMenu = async (req, res) => {
    try {
        let navName = req.body.name
        if (!navName) {
            return res.status(400).json({ error: 'Invalid data' })
        }
        const dataToSave = []
        const treeData = collect(JSON.parse(req.body.menu))
        const root_items = treeData.where('parent', '#').all()
        root_items.forEach((rootElement, rootIndex) => {
            const parent = {
                _id: rootElement.li_attr.data_id,
                position: rootIndex,
                label: JSON.parse(rootElement.li_attr.label),
                url: JSON.parse(rootElement.li_attr.url),
            }
            parent.child = []
            treeData
                .where('parent', rootElement.id)
                .all()
                .forEach((firstChildElement, fcIndex) => {
                    const firstChild = {
                        _id: firstChildElement.li_attr.data_id,
                        position: fcIndex,
                        label: JSON.parse(firstChildElement.li_attr.label),
                        url: JSON.parse(firstChildElement.li_attr.url),
                    }
                    firstChild.child = []
                    treeData
                        .where('parent', firstChildElement.id)
                        .all()
                        .forEach((secondChildElement, scIndex) => {
                            const secondChild = {
                                _id: secondChildElement.li_attr.data_id,
                                position: scIndex,
                                label: JSON.parse(
                                    secondChildElement.li_attr.label
                                ),
                                url: JSON.parse(secondChildElement.li_attr.url),
                            }
                            firstChild.child.push(secondChild)
                        })
                    parent.child.push(firstChild)
                })
            dataToSave.push(parent)
        })

        const save = await Menu.findOneAndUpdate(
            {
                nav_position: navName,
                brand: req.authUser?.selected_brand?._id,
                country: req.authUser?.selected_brand?.country,
            },
            {
                $set: {
                    nav_items: dataToSave,
                },
            }
        )
        if (!save?._id) {
            return res.status(400).json({ error: 'Menu not found' })
        }
        return res.status(200).json({
            message: `Menu position changed`,
            item: save,
        })
    } catch (error) {
        // console.log(error)
        return res.status(400).json({ error: 'Something went wrong' })
    }
}

module.exports = {
    listMenu,
    addMenu,
    editMenu,
    saveEditMenu,
    deleteMenu,
    saveMenu,
}
