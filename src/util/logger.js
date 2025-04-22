const { createLogger, format, transports } = require('winston')
const util = require('util')
const config = require('../config/config')
const { EApplicationEnvironment } = require('../constant/application')
const path = require('path')
const fs = require('fs')

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', 'logs')
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
}

const consoleLogFormat = format.printf(
    ({ level, message, timestamp, meta = {} }) => {
        return `${level.toUpperCase()} [${timestamp}] ${message}\nCERCA_CARS: ${util.inspect(
            meta,
            {
                showHidden: false,
                depth: null,
                colors: true
            }
        )}\n`
    }
)

const consoleTransport = () => {
    return config.ENV === EApplicationEnvironment.DEVELOPMENT
        ? [
              new transports.Console({
                  level: config.LOG_LEVEL || 'info',
                  format: format.combine(
                      format.colorize(),
                      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                      consoleLogFormat
                  )
              })
          ]
        : []
}

const fileLogFormat = format.printf(
    ({ level, message, timestamp, meta = {} }) => {
        const processedMeta = Object.entries(meta).reduce(
            (acc, [key, value]) => {
                acc[key] =
                    value instanceof Error
                        ? {
                              name: value.name,
                              message: value.message,
                              stack: value.stack
                          }
                        : value
                return acc
            },
            {}
        )

        return JSON.stringify(
            {
                level: level.toUpperCase(),
                message,
                timestamp,
                meta: processedMeta
            },
            null,
            2
        )
    }
)

const fileTransport = () => {
    return [
        new transports.File({
            filename: path.join(logsDir, `${config.ENV}.log`),
            level: config.LOG_LEVEL || 'info',
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                fileLogFormat
            ),
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5
        })
    ]
}

const logger = createLogger({
    level: config.LOG_LEVEL || 'info',
    defaultMeta: { service: 'your-service-name' },
    transports: [...consoleTransport(), ...fileTransport()],
    exceptionHandlers: [
        new transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
})

// Handle uncaught exceptions and promise rejections
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason)
})

module.exports = { logger }
