const mongoose = require('mongoose')
const config = require('../config/config')
const { logger } = require('../util/logger')

const connectDB = async () => {
    try {
        await mongoose.connect(config.DATABASE_URL, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        })

        logger.info('DATABASE_CONNECTED', {
            meta: {
                url: config.DATABASE_URL,
                status: 'connected'
            }
        })

        mongoose.connection.on('error', (err) => {
            logger.error('DATABASE_ERROR', { meta: err })
        })

        mongoose.connection.on('disconnected', () => {
            logger.warn('DATABASE_DISCONNECTED')
        })
    } catch (error) {
        logger.error('DATABASE_CONNECTION_FAILED', {
            meta: {
                error: error.message,
                stack: error.stack
            }
        })
        process.exit(1)
    }
}

module.exports = { connectDB }
