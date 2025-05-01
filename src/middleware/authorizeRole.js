const httpError = require('../util/httpError')

const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        const user = req.user

        if (!user || !allowedRoles.includes(user.role)) {
            return httpError(
                res,
                'Access denied: insufficient permissions',
                403
            )
        }
        next()
    }
}


module.exports = authorizeRole;