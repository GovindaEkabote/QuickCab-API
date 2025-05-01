const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { HASH_SALT_ROUNDS } = require('../constant/constant.js')
const validator = require('validator')
const Schema = mongoose.Schema

const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
            validate: [validator.isEmail, 'Invalid email']
        },
        password: {
            type: String,
            select: false,
            minlength: 8
        },
        phoneNumber: {
            type: String,
            unique: true,
            sparse: true,
            validate: {
                validator: (v) => /^\+?[\d\s-]{10,15}$/.test(v),
                message: 'Invalid phone number'
            }
        },
        profile_image: {
            public_id: {
                type: String
            },
            url: {
                type: String
            }
        },
        role: {
            type: String,
            enum: ['user', 'driver', 'admin'],
            default: 'user'
        },
        socialAuth: {
            googleId: String,
            facebookId: String,
            appleId: String
        },
        referenceToken: {
            type: String,
            require: true,
            default: '-'
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'deleted'],
            default: 'active'
        },
        suspensionReason: {
            type: String,
            default: null
        },
    },
    { timestamps: true }
)

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, HASH_SALT_ROUNDS)
})

userSchema.method.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

module.exports = mongoose.model('User', userSchema)
