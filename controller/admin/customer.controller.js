const User = require('../../model/User')
const AjaxPaginationCustomerResource = require('../../resources/api/ajaxPaginationCustomer.resource')
require('dotenv').config()

let session

const list = async (req, res) => {
    try {
        // const users = await User.find()
        // res.render(`admin/ecommerce/customers/listing`, { data: users })
        res.render(`admin/ecommerce/customers/listing-ajax`)
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const customers = async (req, res) => {
    try {
        session = req.authUser

        let { draw, start, length } = req.query
        let page = start / length + 1 || 1
        let limit = req.query.length ? req.query.length : 25

        let columns = req.query.columns
        let dateColumn = columns?.at(5)
        let statusColumn = columns?.at(3)

        let sortColumn = req.query.order?.[0]?.column
        let sortDirection = req.query.order?.[0]?.dir
        let selectedColumn = columns?.at(sortColumn)
        let sortOrder = {
            [selectedColumn?.data]: sortDirection == 'desc' ? -1 : 1,
        }

        // Pagination options
        const options = {
            page,
            limit,
            sort: sortOrder,
        }
        // Query to fetch orders
        let query = {}
        // if search order is active
        if (req.query?.search?.value) {
            query = {
                ...query,
                // $text: {
                //     $search: req.query?.search?.value?.toLowerCase(),
                // },
                first_name: {
                    $regex: `.*${req.query?.search?.value?.toLowerCase()}.*`,
                    $options: 'i',
                },
            }
        }

        // Fetching orders with pagination
        const customersCount = await User.find(query).count()
        const customers = await User.paginate(query, options)

        customers.draw = draw
        customers.totalItems = customersCount

        return res
            .status(200)
            .json(new AjaxPaginationCustomerResource(customers).exec())
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const detail = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id }).populate(
            'cards'
        )
        res.render(`admin/ecommerce/customers/details`, { user })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const activateUser = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id })
        user.active = !user.active
        await user.save()
        res.redirect(`/admin/ecommerce/customers`)
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

module.exports = {
    list,
    customers,
    detail,
    activateUser,
}
