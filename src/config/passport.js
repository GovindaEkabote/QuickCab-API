const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook')
const User = require('../model/user.model')
const config = require('./config')

// Google
passport.use(
    new GoogleStrategy(
        {
            clientID: config.GOOGLE_AUTH,
            clientSecret: config.GOOGLE_SECRET,
            callbackURL: 'http://localhost:3000/api/v1/google/callback',
            scope: ['profile', 'email'],
            passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value

                // Check by Google ID OR email
                let user = await User.findOne({
                    $or: [{ 'socialAuth.googleId': profile.id }, { email }]
                })

                if (!user) {
                    user = await User.create({
                        fullName: profile.displayName,
                        email,
                        socialAuth: { googleId: profile.id },
                        role: 'user' // Add default role
                    })
                } else if (!user.socialAuth.googleId) {
                    // Update existing user with Google ID
                    user.socialAuth.googleId = profile.id
                    await user.save()
                }

                return done(null, user)
            } catch (err) {
                return done(err, null)
            }
        }
    )
)

// FaceBook
passport.use(
    new FacebookStrategy(
        {
            clientID: config.FACEBOOK_APP_ID,
            clientSecret: config.FACEBOOK_APP_SECRET,
            callbackURL: 'http://localhost:3000/api/v1/facebook/callback',
            profileFields: ['id', 'displayName', 'emails']
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({
                    'socialAuth.facebookId': profile.id
                })
                if (!user) {
                    user = await User.create({
                        fullName: profile.displayName,
                        email: profile.emails?.[0]?.value || null,
                        socialAuth: { facebookId: profile.id }
                    })
                }
                return done(null, user)
            } catch (error) {
                return done(error, null)
            }
        }
    )
)

// Apple..
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))
