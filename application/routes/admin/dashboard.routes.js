const express = require('express')
require('express-group-routes')
const router = express.Router()
const dashboardController = require('../../controller/admin/dashboard.controller')
// Services
const { getData } = require('../../helper/gAnalytics')
const {
    format,
    addDays,
    subDays,
    parseISO,
    startOfMonth,
    endOfMonth,
} = require('date-fns')

router.group('/', (router) => {
    router.get('/', dashboardController.dashboard)
    router.get('/analytics', dashboardController.analyticsDashboard)

    // router.get('/api', (req, res) => {
    //     const { metrics, startDate, endDate } = req.query
    //     // console.log(`Requested metrics: ${metrics}`)
    //     // console.log(`Requested start-date: ${startDate}`)
    //     // console.log(`Requested end-date: ${endDate}`)

    //     Promise.all(
    //         getData(metrics ? metrics.split(',') : metrics, startDate, endDate)
    //     )
    //         .then((data) => {
    //             // flatten list of objects into one object
    //             // console.log(data)
    //             const body = {}
    //             Object.values(data).forEach((value) => {
    //                 Object.keys(value).forEach((key) => {
    //                     body[key] = value[key]
    //                 })
    //             })

    //             res.send({ data: body })

    //             // console.log('Done')
    //         })
    //         .catch((err) => {
    //             console.log('Error:')
    //             console.log(err)
    //             res.send({
    //                 status: 'Error getting a metric',
    //                 message: `${err}`,
    //             })
    //             console.log('Done')
    //         })
    // })

    router.get('/api/graph', (req, res) => {

        const metrics = req.query.metrics
        const startDate =
            req.query.startDate ||
            format(startOfMonth(new Date()), 'yyyy-MM-dd')
        const endDate =
            req.query.endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd')
        // console.log(`Requested graph of metric: ${metrics}`)

        // 1 week time frame
        let promises = []
        for (let i = 10; i >= 0; i -= 1) {
            promises.push(getData([metrics], `${i}daysAgo`, `${i}daysAgo`))
        }
        promises = [].concat(...promises)

        Promise.all(promises)
            .then((data) => {
                // flatten list of objects into one object
                const body = {}
                body[metrics] = []
                Object.values(data).forEach((value) => {
                    body[metrics].push(
                        value[
                            metrics.startsWith('ga:')
                                ? metrics
                                : `ga:${metrics}`
                        ]
                    )
                })
                // console.log(body)

                res.send({ data: body })
                // console.log('Done')
            })
            .catch((err) => {
                // console.log('Error:')
                // console.log(err)
                res.send({ status: 'Error', message: `${err}` })
                // console.log('Done')
            })
    })
})

module.exports = router
