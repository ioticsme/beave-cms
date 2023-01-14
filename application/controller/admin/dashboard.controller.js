require('dotenv').config()
const Joi = require('joi')
const axios = require('axios')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Admin = require('../../model/Admin')
const {
    format,
    addDays,
    subDays,
    parse,
    parseISO,
    startOfMonth,
    subMonths,
    endOfMonth,
    startOfDay,
    endOfDay,
    differenceInDays,
} = require('date-fns')

// Services
const { default: collect } = require('collect.js')
const Order = require('../../model/Order')
const { differenceInPercentage } = require('../../helper/Operations.helper')
const User = require('../../model/User')


const basicDashboard = async(req, res) => {
    res.render(`admin/dashboards/basic`, {})
}
const ecommerceDashboard = async (req, res) => {
    try {
        let date_range_obj = {}
        if (req.query.dt) {
            // console.log(req.query.dt)
            date_ranges = req.query.dt.split(' - ')
            // console.log(date_ranges)
            const sd_timestamp = Date.parse(
                date_ranges[0].split('/').reverse().join('-')
            )
            const ed_timestamp = Date.parse(
                date_ranges[1].split('/').reverse().join('-')
            )
            date_range_obj.sdObj = new Date(sd_timestamp)
            date_range_obj.edObj = new Date(ed_timestamp)
        }
        // console.log('reqSD '+ date_range_obj?.sdObj)
        // console.log('reqED '+ date_range_obj?.edObj)
        // console.log('def '+ startOfMonth(new Date()))
        const dateObject = {
            sd_current_month: date_range_obj?.sdObj
                ? startOfDay(date_range_obj?.sdObj)
                : startOfMonth(new Date()),
            ed_current_month: date_range_obj?.edObj
                ? endOfDay(date_range_obj?.edObj)
                : new Date(),
        }

        const day_difference = differenceInDays(
            dateObject.ed_current_month,
            dateObject.sd_current_month
        )

        dateObject.sd_prev_month = startOfDay(
            subDays(dateObject.sd_current_month, day_difference)
        )
        dateObject.ed_prev_month = endOfDay(
            subDays(dateObject.sd_current_month, 1)
        )

        // console.log(dateObject)
        const dashBoardData = {}
        const orders = await Order.find({
            brand: req.authUser.selected_brand?._id,
            country: req.authUser.selected_brand?.country,
            created_at: {
                $gte: dateObject.sd_prev_month,
                $lte: dateObject.ed_current_month,
            },
            order_status: 'success',
        })
        const orderSummary = {
            currentMonth: collect(orders)
                .whereBetween('created_at', [
                    dateObject.sd_current_month,
                    dateObject.ed_current_month,
                ])
                .sum('amount_to_pay'),
            currentMonthCount: collect(orders)
                .whereBetween('created_at', [
                    dateObject.sd_current_month,
                    dateObject.ed_current_month,
                ])
                .count(),
            lastMonth: collect(orders)
                .whereBetween('created_at', [
                    dateObject.sd_prev_month,
                    dateObject.ed_prev_month,
                ])
                .sum('amount_to_pay'),
            lastMonthCount: collect(orders)
                .whereBetween('created_at', [
                    dateObject.sd_prev_month,
                    dateObject.ed_prev_month,
                ])
                .count(),
        }

        orderSummary.monthlyDifferenceInPercentage =
            await differenceInPercentage(
                orderSummary.currentMonth,
                orderSummary.lastMonth
            )

        orderSummary.monthlyCountDifferenceInPercentage =
            await differenceInPercentage(
                orderSummary.currentMonthCount,
                orderSummary.lastMonthCount
            )

        orderSummary.last_thirty_day_labels = []
        orderSummary.last_thirty_day_sum = []
        for (let i = 0; i < day_difference; i++) {
            orderSummary.last_thirty_day_labels.push(
                `${format(
                    addDays(dateObject.sd_current_month, i),
                    'MMM'
                )} ${format(addDays(dateObject.sd_current_month, i), 'dd')}`
            )
            const daySum = collect(orders)
                .whereBetween('created_at', [
                    startOfDay(addDays(dateObject.sd_current_month, i)),
                    endOfDay(addDays(dateObject.sd_current_month, i)),
                ])
                .sum('amount_to_pay')
            orderSummary.last_thirty_day_sum.push(daySum / 1000)
        }

        // console.log(orderSummary)

        // BEGIN:: Users Metrics
        const users = await User.find()
        const userSummary = {
            currentMonth: collect(users)
                .whereBetween('created_at', [
                    dateObject.sd_current_month,
                    dateObject.ed_current_month,
                ])
                .count(),
            lastMonth: collect(users)
                .whereBetween('created_at', [
                    dateObject.sd_prev_month,
                    dateObject.ed_prev_month,
                ])
                .count(),
        }

        userSummary.monthlyDifferenceInPercentage =
            await differenceInPercentage(
                userSummary.currentMonth,
                userSummary.lastMonth
            )

        // END:: Users Metrics

        const week_summary = collect(orders)
            .whereBetween('created_at', [
                startOfDay(subDays(new Date(), 7)),
                endOfDay(subDays(new Date(), 1)),
            ])
            .groupBy('date_created_filter')

        const daily_sales_array = []
        const daily_sales_day_array = []
        collect(week_summary).map((items, key) => {
            daily_sales_array.push(collect(items).sum('amount_to_pay'))
            daily_sales_day_array.push(format(parseISO(key), 'dd-MM-yyyy'))
        })

        const daily_summary = {
            daily_sales_array,
            daily_sales_day_array,
        }

        orderSummary.dayOrderSummary = {
            yesterday: collect(orders)
                .whereBetween('created_at', [
                    startOfDay(subDays(new Date(), 1)),
                    endOfDay(subDays(new Date(), 1)),
                ])
                .sum('amount_to_pay'),
            dayBeforeYesterday: collect(orders)
                .whereBetween('created_at', [
                    startOfDay(subDays(new Date(), 2)),
                    endOfDay(subDays(new Date(), 2)),
                ])
                .sum('amount_to_pay'),
        }

        orderSummary.dailyDifferenceInPercentage = await differenceInPercentage(
            orderSummary.dayOrderSummary.yesterday,
            orderSummary.dayOrderSummary.dayBeforeYesterday
        )
        res.render(`admin/dashboards/ecommerce`, {
            orderSummary,
            daily_summary,
            userSummary,
            dateObject: {
                sd_req_period: format(
                    dateObject.sd_current_month,
                    'dd/MM/yyyy'
                ),
                ed_req_period: format(
                    dateObject.ed_current_month,
                    'dd/MM/yyyy'
                ),
                sd_prev_period: format(dateObject.sd_prev_month, 'dd/MM/yyyy'),
                ed_prev_period: format(dateObject.ed_prev_month, 'dd/MM/yyyy'),
            },
        })
    } catch (error) {
        console.log(error)
        return res.render(`admin/error-500`)
    }
}

const analyticsDashboard = async (req, res) => {
    // try {
    // const metrics = req.query.metrics ?? 'users,pageViews'
    // const metrics = 'users,pageViews,organicSearches,goalConversionRateAll'

    let date_range_obj = {}
    if (req.query.dt) {
        // console.log(req.query.dt)
        date_ranges = req.query.dt.split(' - ')
        // console.log(date_ranges)
        const sd_timestamp = Date.parse(
            date_ranges[0].split('/').reverse().join('-')
        )
        const ed_timestamp = Date.parse(
            date_ranges[1].split('/').reverse().join('-')
        )
        date_range_obj.sdObj = format(new Date(sd_timestamp), 'yyyy-MM-dd')
        date_range_obj.edObj = format(new Date(ed_timestamp), 'yyyy-MM-dd')
    }

    // console.log(date_range_obj)

    const startDate =
        date_range_obj.sdObj || format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const endDate =
        date_range_obj.edObj || format(endOfMonth(new Date()), 'yyyy-MM-dd')
    // console.log(`Requested metrics: ${metrics}`)
    // console.log(`Requested start-date: ${startDate}`)
    // console.log(`Requested end-date: ${endDate}`)

    try {
        const analyticsData = await getReports(startDate, endDate)
            .then((response) => {
                // console.log(response.data[0].data.totals[0].values)
                return response.data
            })
            .catch((error) => {
                console.log(error)
            })
        // return res.json(analyticsData.reports[0].data.totals[0].values[0])
        const topLineChartData = collect(analyticsData.reports[0].data.rows)
            .pluck('metrics')
            .map((item, key) => {
                // console.log(key)
                const day = collect(analyticsData.reports[0].data.rows)
                    .pluck('dimensions')
                    .flatten()
                    .toArray()[key]
                // return [parseInt(day), ...item[0].values.map(Number)]
                return [key, ...item[0].values.map(Number)]
            })

        const test = [
            [1, 2, 3],
            [4, 5, 6],
        ]
        // return res.json({
        //     topLineChartData,
        //     test,
        // })
        // return res.json(analyticsData.reports)

        return res.render(`admin/dashboards/web-analytics`, {
            analyticsData: analyticsData,
            topLineChartData: topLineChartData,
        })
    } catch (error) {
        return res.render(`admin/error-500`)
    }
}

module.exports = {
    basicDashboard,
    ecommerceDashboard,
    analyticsDashboard,
}
