const express = require('express')
const path = require('path')
const globalErrorHandler = require('./middleware/globalErrorHandler')
const responseMessage = require('./constant/responseMessage')
const httpError = require('./util/httpError')
const helmet = require('helmet');
const cors = require('cors')
const cookieParser = require('cookie-parser')
const passport = require("passport");
const session = require('express-session');
const config = require('./config/config')
const { EApplicationEnvironment } = require('./constant/application')
const AuthRoutes = require('./router/auth.router')
const UserRoutes = require('./router/user.router')

require('./config/passport')
const app = express()

// Middleware
app.use(helmet());
app.use(cors({
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    origin: 'https://cercacaes.com', 
    credentials: true
}))
app.use(session({
    secret:config.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:config.ENV === EApplicationEnvironment.PRODUCTION,
        maxAge:1000 * 60 * 60 * 24 
    }
}))
app.use(express.json())
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../', 'public')))
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
// Routes
app.use('/api/v1', AuthRoutes)
app.use('/api/v1', UserRoutes)

app.set('views', path.join(__dirname, 'view'));

// 404 Handler
// eslint-disable-next-line no-unused-vars
app.use((req, res, next) => {
    try {
        // You can customize the NOT_FOUND message as needed
        throw new Error(responseMessage.NOT_FOUND('route'))
    } catch (error) {
        httpError(res, error, 404)
    }
})

// Global Error handler
app.use(globalErrorHandler)

module.exports = app
