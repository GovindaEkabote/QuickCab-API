const admin = require('firebase-admin')
const serviceAccount = require('../constant/serviceAccountKey.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

module.exports = admin
