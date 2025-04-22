/**
 * @typedef {Object} HttpRequestInfo
 * @property {string} [ip]
 * @property {string} method
 * @property {string} url
 */

/**
 * @typedef {Object} HttpError
 * @property {boolean} success
 * @property {number} statusCode
 * @property {HttpRequestInfo} request
 * @property {string} message
 * @property {*} data
 * @property {Object|null} [trace]
 */

/**
 * Create a standard HTTP error response
 * @param {Object} params
 * @param {number} params.statusCode
 * @param {string} params.message
 * @param {*} params.data
 * @param {Object|null} [params.trace]
 * @param {import('express').Request} req
 * @returns {HttpError}
 */

function createHttpResponse({ success, statusCode, message, data, req }) {
    return {
        success,
        statusCode,
        message,
        data,
        request: {
            ip: req.ip ?? null,
            method: req.method,
            url: req.originalUrl
        }
    }
}

function createHttpError({ statusCode, message, data, trace = null, req }) {
    return {
        success: false,
        statusCode,
        message,
        data,
        trace,
        request: {
            ip: req.ip ?? null,
            method: req.method,
            url: req.originalUrl
        }
    }
}

module.exports = {
    createHttpResponse,
    createHttpError
}
