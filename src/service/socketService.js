const WebSocket = require('ws')
const Driver = require('../model/driver.model')
const { logger } = require('../util/logger')
const userModel = require('../model/user.model')

const activeConnections = new Map()
function initSocketServer(server) {
    try {
        const wss = new WebSocket.Server({ noServer: true }) // Create without attaching immediately

        server.on('upgrade', (request, socket, head) => {
            try {
                const userId = request.url.split('?id=')[1]

                if (!userId) {
                    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
                    socket.destroy()
                    return
                }

                // You could add additional authentication here

                wss.handleUpgrade(request, socket, head, (ws) => {
                    wss.emit('connection', ws, request)
                })
            } catch (err) {
                logger.error('WEBSOCKET_UPGRADE_ERROR', {
                    meta: {
                        error: err.message,
                        stack: err.stack
                    }
                })
                socket.destroy()
            }
        })

        wss.on('connection', (ws, req) => {
            try {
                const userId = req.url.split('?id=')[1]
                activeConnections.set(userId, ws)

                ws.isAlive = true
                ws.on('pong', () => {
                    ws.isAlive = true
                })

                ws.on('close', () => {
                    activeConnections.delete(userId)
                    Driver.findByIdAndUpdate(userId, { isOnline: false })
                        .exec()
                        .catch((err) =>
                            logger.error('DRIVER_STATUS_UPDATE_ERROR', {
                                meta: err
                            })
                        )
                })
            } catch (err) {
                logger.error('WEBSOCKET_CONNECTION_ERROR', {
                    meta: {
                        error: err.message,
                        stack: err.stack
                    }
                })
                ws.close(1011, 'Internal Server Error')
            }
        })

        // Ping all connections periodically to check health
        const interval = setInterval(() => {
            wss.clients.forEach((ws) => {
                if (!ws.isAlive) {
                    ws.terminate()
                    return
                }
                ws.isAlive = false
                ws.ping()
            })
        }, 30000)

        wss.on('close', () => {
            clearInterval(interval)
        })

        return wss
    } catch (err) {
        logger.error('WEBSOCKET_SERVER_INIT_FAILED', {
            meta: {
                error: err.message,
                stack: err.stack
            }
        })
        throw err
    }
}

// Emit to a specific driver
function emitToDriver(driverId, event, data) {
    try {
        const ws = activeConnections.get(driverId.toString())
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event, data }), (err) => {
                if (err) {
                    logger.error('WEBSOCKET_SEND_ERROR', {
                        driverId,
                        event,
                        error: err.message
                    })
                    // Fallback to push notification
                    createPushNotification(driverId, event, data)
                }
            })
        } else {
            createPushNotification(driverId, event, data)
        }
    } catch (err) {
        logger.error('EMIT_TO_DRIVER_ERROR', {
            driverId,
            event,
            error: err.message
        })
    }
}

// Emit to a specific user
function emitToUser(userId, event, data) {
    try {
        const ws = activeConnections.get(userId.toString())
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event, data }), (err) => {
                if (err) {
                    logger.error('WEBSOCKET_SEND_ERROR', {
                        userId,
                        event,
                        error: err.message
                    })
                    createPushNotification(userId, event, data)
                }
            })
        } else {
            createPushNotification(userId, event, data)
        }
    } catch (err) {
        logger.error('EMIT_TO_USER_ERROR', {
            userId,
            event,
            error: err.message
        })
    }
}

// Emit to users within a certain radius of coordinates
async function emitToNearbyUsers(coordinates, event, data, maxDistance = 5000) {
    try {
        // Find nearby users (could be optimized with caching)
        const nearbyUsers = await userModel.aggregate([
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates
                    },
                    distanceField: 'distance',
                    maxDistance: maxDistance,
                    spherical: true,
                    query: {
                        status: 'active',
                        isBlocked: false
                    }
                }
            },
            { $limit: 100 }, // Limit to prevent overloading
            { $project: { _id: 1 } }
        ])

        // Send to connected nearby users
        nearbyUsers.forEach((user) => {
            const ws = activeConnections.get(user._id.toString())
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event, data }), (err) => {
                    if (err) {
                        logger.error('NEARBY_WEBSOCKET_SEND_ERROR', {
                            userId: user._id,
                            event,
                            error: err.message
                        })
                    }
                })
            }
        })

        return nearbyUsers.length
    } catch (err) {
        logger.error('EMIT_TO_NEARBY_USERS_ERROR', {
            coordinates,
            event,
            error: err.message,
            stack: err.stack
        })
        return 0
    }
}

// Fallback push notification service
async function createPushNotification(userId, event, data) {
    try {
        // In a real implementation, this would use FCM/APNS
        logger.info('PUSH_NOTIFICATION_FALLBACK', {
            userId,
            event,
            data
        })

        // Here you would implement actual push notification logic
        // await pushNotificationService.send(userId, { event, data });
    } catch (err) {
        logger.error('PUSH_NOTIFICATION_ERROR', {
            userId,
            event,
            error: err.message
        })
    }
}

module.exports = {
    initSocketServer,
    emitToDriver,
    emitToUser,
    emitToNearbyUsers
}
