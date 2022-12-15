require('dotenv').config()
const redis = require('redis')
const asyncRedis = require('async-redis')
const { sendAdminNotification } = require('./Slack.helper')

const redisConnect = async () => {
    try {
        const client = asyncRedis.createClient({
            legacyMode: true,
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        })

        client.on('error', (error) => {
            console.error(`❗️ Redis Error: ${error}`)
            sendAdminNotification(`❗️ Redis Error: ${error}`)
            // client.end()
        })

        client.on('connect', () => {
            console.log('✅ Connect redis success !')
        })

        // await client.connect()

        return client
    } catch (error) {
        console.log('Redis Client Error', error)
        return error
    }
}

const getCache = async (key) => {
    // await client.connect()
    try {
        const client = await redisConnect()
        return await client.get(key)
    } catch (error) {
        console.log('Redis Client Error', error)
        return error
    }
}

const setCache = async (key, data, expiry = 300) => {
    // await client.connect()
    try {
        const client = await redisConnect()
        // console.log(data)
        await client.set(key, data, 'EX', expiry) // Response will be 'OK'
        // client.expire(key, expiry)
        return 'OK'
    } catch (error) {
        console.log('Redis Client Error', error)
        return error
    }
}

const removeCache = async (keys) => {
    // await client.connect()
    try {
        const client = await redisConnect()
        return await client.del(keys)
    } catch (error) {
        console.log('Redis Client Error', error)
        return error
    }
}

const clearCacheAll = async () => {
    // await client.connect()
    try {
        const client = await redisConnect()
        const keys_to_remove = []
        for await (const key of client.scanIterator({
            MATCH: 'semnox-*',
        })) {
            keys_to_remove.push(key)
        }
        for await (const key of client.scanIterator({
            MATCH: 'data-*',
        })) {
            keys_to_remove.push(key)
        }
        return await client.del(keys_to_remove)
    } catch (error) {
        console.log('Redis Client Error', error)
        return error
    }
}

const flushCache = async () => {
    // await client.connect()
    try {
        const client = await redisConnect()
        return await client.flushAll()
    } catch (error) {
        console.log('Redis Client Error', error)
        return error
    }
}

// // BEGIN:: REDIS PUB/SUB server to server messaging
// const Redis = require('ioredis')
// const pubRedis = new Redis(`${process.env.REDIS_URL}`)
// const subRedis = new Redis(`${process.env.REDIS_URL}`)

// setInterval(() => {
//     const message = { foo: Math.random() }
//     // Publish to my-channel-1 or my-channel-2 randomly.
//     const channel = `my-channel-${1 + Math.round(Math.random())}`

//     // Message can be either a string or a buffer
//     pubRedis.publish(channel, JSON.stringify(message))
//     // console.log('Published %s to %s', message, channel)
// }, 2000)

// subRedis.subscribe('my-channel-1', 'my-channel-2', (err, count) => {
//     if (err) {
//         // Just like other commands, subscribe() can fail for some reasons,
//         // ex network issues.
//         console.error('Failed to subscribe: %s', err.message)
//     } else {
//         // `count` represents the number of channels this client are currently subscribed to.
//         console.log(
//             `Subscribed successfully! This client is currently subscribed to ${count} channels.`
//         )
//     }
// })

// subRedis.on('message', (channel, message) => {
//     console.log(`Received ${message} from ${channel}`)
// })
// // END:: REDIS PUB/SUB server to server messaging

module.exports = {
    getCache,
    setCache,
    removeCache,
    clearCacheAll,
    flushCache,
    redisConnect,
}
