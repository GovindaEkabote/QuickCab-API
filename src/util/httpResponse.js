const { createHttpResponse } = require('../types/types') // Import the createHttpResponse function
const config = require('../config/config')
const { EApplicationEnvironment } = require('../constant/application')
// const {logger} = require('../util/logger')

// Assuming you're using an Express route handler
const httpResponse = (
    req,
    res,
    responseStatusCode,
    responseMessage,
    data = null
) => {
    try {
        const response = createHttpResponse({
            success: responseStatusCode >= 200 && responseStatusCode < 300,
            statusCode: responseStatusCode,
            message: responseMessage,
            data,
            req
        })

        if (config.ENV === EApplicationEnvironment.PRODUCTION) {
            delete response.request.ip
        }

        return res.status(responseStatusCode).json(response)
    } catch (error) {
        return res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Internal Server Error',
            data: null,
            request: {
                ip: req.ip ?? null,
                method: req.method,
                url: req.originalUrl
            }
        })
    }
}

module.exports = httpResponse
