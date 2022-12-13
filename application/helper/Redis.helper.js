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

module.exports = {
    getCache,
    setCache,
    removeCache,
    clearCacheAll,
    flushCache,
    redisConnect,
}
