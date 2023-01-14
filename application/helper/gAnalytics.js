// Reference:: https://www.multiminds.eu/blog/2018/11/google-analytics-reporting-api/
// Reference:: https://ga-dev-tools.web.app/ga4/dimensions-metrics-explorer/
// Reference:: https://developers.google.com/analytics/devguides/reporting/core/v4/basics#reports

const { google } = require('googleapis')

const metricsQuery = (startDate, endDate) => {
    // Config
    const clientEmail = process.env.CLIENT_EMAIL
    const privateKey = process.env.GA_PRIVATE_KEY.replace(
        new RegExp('\\\\n'),
        '\n'
    )
    const scopes = [
        'https://www.googleapis.com/auth/analytics.readonly',
        // 'https://analyticsreporting.googleapis.com/v4/reports:batchGet',
    ]

    // API's
    const analytics = google.analyticsreporting('v4')
    const viewId = process.env.VIEW_ID
    let jwt = new google.auth.JWT(clientEmail, null, privateKey, scopes)

    return (basic_report = {
        reportRequests: [
            {
                viewId: viewId,
                dateRanges: [{ startDate: startDate, endDate: endDate }],
                metrics: [
                    { expression: 'ga:users' },
                    { expression: 'ga:sessions' },
                    { expression: 'ga:pageviews' },
                ],
                dimensions: [{ name: 'ga:date' }],
            },
            {
                viewId: viewId,
                dateRanges: [{ startDate: startDate, endDate: endDate }],
                dimensions: [{ name: 'ga:country' }],
                orderBys: [
                    {
                        orderType: 'VALUE',
                        sortOrder: 'DESCENDING',
                        fieldName: 'ga:visits',
                    },
                ],
            },
        ],
    })
}

const getReports = async function (startDate, endDate) {
    await jwt.authorize()

    const reports = metricsQuery(startDate, endDate)
    let request = {
        headers: { 'Content-Type': 'application/json' },
        auth: jwt,
        resource: reports,
    }

    return await analytics.reports.batchGet(request)
}

module.exports = { getReports }
