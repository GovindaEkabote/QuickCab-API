const { createHttpError } = require('../types/types') // Import createHttpError function
const responseMessage = require('../constant/responseMessage')
const config = require('../config/config') // Import config
const { EApplicationEnvironment } = require('../constant/application') // Import enum for environment
// const {logger} = require('../util/logger')

const httpError = (res, err, errorStatusCode = 500) => {
    try {
        // Extract useful information from the error object
        const message =
            err instanceof Error
                ? err.message
                : responseMessage.SOMETHING_WENT_WRONG
        const trace = err instanceof Error ? err.stack : null

        // Create the error response using the createHttpError function
        const response = createHttpError({
            statusCode: errorStatusCode,
            message,
            data: null, // No data in error response by default, but you can customize it
            trace,
            req: res.req // Attach the request object from the response to access request data
        })

        // Log the error (for debugging purposes)
        // Log the response meta
        // logger.info(`CONTROLLER_ERROR`, {
        //     meta: response
        // });

        // Production Env check - remove IP in production to prevent leaking sensitive data
        if (config.ENV === EApplicationEnvironment.PRODUCTION) {
            delete response.request.ip // Remove IP address in production
            delete response.request.trace
        }

        // Send the error response
        res.status(errorStatusCode).json(response) // Use res to send the response
    } catch (error) {
        // If an error occurs in the error handler, fallback response

        // logger.error('Error in error handler:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Internal Server Error',
            data: null,
            request: {
                ip: res.req.ip ?? null,
                method: res.req.method,
                url: res.req.originalUrl
            }
        })
    }
}

module.exports = httpError
