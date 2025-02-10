require('dotenv').config()
const express = require('express')
const nunjucks = require('nunjucks')
const app = express()
// const cms = require('../cms-package')
const beaveCMS = require('beave-cms')


app.use(express.static('public'))


// app.get('/admin/dashboard', async(req, res) => {
//     return res.json('Hellooo')
// })

app.use(beaveCMS)
// Setting template engine (nunjucks)
nunjucks.configure('views', {
    express: app,
    autoescape: true,
})
app.set('view engine', 'njk')

// app.get('/admin/config/content-types', async(req, res) => {
//     return res.send('test')
// })

const internal_port = process.env.DOCKER_CONTAINER_NAME
    ? 8080
    : process.env.PORT
const port = process.env.PORT

app.listen(internal_port, async () => {
    console.log(`App running on port ${port}`)
}).on('error', () => {
    console.log('Application error')
})