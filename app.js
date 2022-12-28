require('dotenv').config()
const express = require('express')
const app = express()

const application = require('./application')
// const application = require('@ioticsme/cms')

app.use(express.static('public'))

app.use(application)

// app.get('/admin/config/content-types', async(req, res) => {
//     return res.send('test')
// })

const port = process.env.PORT || 8080

app.listen(port, async () => {
    console.log(`App running in port ${port}`)
}).on('error', () => {
    console.log('Application error')
})
