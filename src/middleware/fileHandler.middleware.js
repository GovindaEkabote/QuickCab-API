const multer = require('multer')
const path = require('path')
const createHttpError = require('http-errors')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(
            __dirname,
            '..',
            'public',
            'uploads',
            'profile-images'
        )
        require('fs').mkdirSync(uploadPath, { recursive: true })
        cb(null, uploadPath)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `profile-${uniqueSuffix}${ext}`)
    }
})

const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
        throw createHttpError(400, 'Only JPEG, PNG, and JPG images are allowed')
    }

    if (file.size > maxSize) {
        throw createHttpError(400, 'File size must be less than 5MB')
    }
}

const profileImageUpload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        try {
            validateFile(file)
            cb(null, true)
        } catch (error) {
            cb(error)
        }
    }
}).single('profileImage')

module.exports = {
    profileImageUpload,
    validateFile
}
