require('dotenv').config()
const express = require('express')
const nunjucks = require('nunjucks')
const app = express()

// const application = require('../cms-package')
const application = require('@ioticsme/beave-cms')

app.use(express.static('public'))


// app.get('/admin/dashboard', async(req, res) => {
//     return res.json('Hellooo')
// })

app.use(application)
// Setting template engine (nunjucks)
nunjucks.configure('views', {
    express: app,
    autoescape: true,
})
app.set('view engine', 'njk')

// app.get('/admin/config/content-types', async(req, res) => {
//     return res.send('test')
// })

const port = process.env.PORT || 8080

app.listen(port, async () => {
    console.log(`App running in port ${port}`)
}).on('error', (e) => {
    console.log(e)
    console.log('Application error')
})
