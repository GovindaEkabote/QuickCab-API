const config = require('../config/config')
const { createHttpError } = require('../types/types')
const { logger } = require('../util/logger')

const globalErrorHandler = (err, req, res, next) => {
    // Extract useful information from the error object
    const message = err instanceof Error ? err.message : 'Something went wrong'
    const trace = err instanceof Error ? err.stack : null

    // Define a default status code, or get it from the error
    const statusCode = err.statusCode || 500

    // Create the error response using createHttpError function
    const response = createHttpError({
        statusCode,
        message,
        data: null, // No data in error response by default, but you can customize it
        trace: config.ENV === 'production' ? null : trace,
        req
    })

    // Log the error (for debugging purposes)
    logger.error(`Error occurred: ${message}`, trace)

    // Send the error response
    res.status(statusCode).json(response)
}

module.exports = globalErrorHandler
