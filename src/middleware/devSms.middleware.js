const config = require('../config/config')
const { EApplicationEnvironment } = require('../constant/application')

const devSmsMiddleware = (req, res, next) => {
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
        req.simulateSms = async (phoneNumber, message) => {
            console.log(`[DEV SMS] To: ${phoneNumber}, Message: ${message}`)
            return true
        }
    }
    next();
}

module.exports = devSmsMiddleware;