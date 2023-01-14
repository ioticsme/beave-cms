require('dotenv').config()
const { default: collect } = require('collect.js')
const Joi = require('joi')
const Order = require('../../model/Order')
const TransactionLog = require('../../model/TransactionLog')
const AjaxPaginationOrderResource = require('../../resources/api/ajaxPaginationOrder.resource')
const PaginationOrderResource = require('../../resources/api/paginationOrder.resource')

const { parse } = require('date-fns')

let session

const orderListing = async (req, res) => {
    try {
        session = req.authUser
        // const orders = await Order.find(
        //     {
        //         brand: session.selected_brand._id,
        //         country: session.selected_brand.country,
        //     },
        //     {},
        //     { sort: { created_at: -1 } }
        // ).populate('user')
        return res.render(`admin/ecommerce/sales/listing-ajax`, {
            // data: orders,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

const orders = async (req, res) => {
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
            populate: 'user',
            sort: sortOrder,
        }
        // Query to fetch orders
        let query = {
            brand: session.selected_brand._id,
            country: session.selected_brand.country,
        }
        // if search order is active
        if (req.query?.search?.value) {
            query = {
                ...query,
                // $text: {
                //     $search: req.query?.search?.value?.toLowerCase(),
                // },
                general: {
                    order_no: {
                        $regex: `.*${req.query?.search?.value?.toLowerCase()}.*`,
                        $options: 'i',
                    },
                }
            }
        }
        // if status field is active
        if (statusColumn?.search?.value) {
            query = {
                ...query,
                payment_status: statusColumn.search.value,
            }
        }
        // if date filter is active
        if (dateColumn?.search?.value) {
            let dateArray = dateColumn.search.value.split(',')
            if (dateArray.length && dateArray.length == 2) {
                query = {
                    ...query,
                    created_at: {
                        $gte: dateArray[0],
                        $lte: dateArray[1],
                    },
                }
            }
        }

        // Fetching orders with pagination
        const orderCount = await Order.find(query).count()
        const orders = await Order.paginate(query, options)

        orders.draw = draw
        orders.totalItems = orderCount

        return res
            .status(200)
            .json(new AjaxPaginationOrderResource(orders).exec())
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

const orderDetail = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            brand: req.authUser.selected_brand._id,
            country: req.authUser.selected_brand.country,
        }).populate('user')

        if (!order) {
            return res.render(`admin/error-404`)
        }
        const transactionLogs = await TransactionLog.find({
            order_id: order._id,
        })

        const payfortLogs = collect(transactionLogs)
            .where('type', 'payfort')
            .all()

        return res.render(`admin/ecommerce/sales/details`, {
            order,
            payfortLogs,
            brand: req.authUser.selected_brand,
        })
    } catch (error) {
        return res.render(`admin/error-404`)
    }
}

module.exports = {
    orderListing,
    orders,
    orderDetail,
}
