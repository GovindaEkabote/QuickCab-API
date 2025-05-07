const WebSocket = require('ws');
const Driver = require('../model/driver.model');
const User = require('../model/user.model')

const activeConnection = new Map();

function initSocketServer(server) {
    const wss = new WebSocket.Server((server));

    wss.on('connection',(ws,req) =>{
        const userId = req.url.split('?id=')[1];
        if(!userId){
            ws.close(1008,'Unauthorized');
            return;
        }
        // Store connection
        activeConnection.set(userId,ws);

        // Handle connection close
        ws.on('close',() =>{
            activeConnection.delete(userId);

            // Update driver status if it was a driver
            Driver.findByIdAndUpdate(userId,{isOnline:false}).exec();
        })
    })
      // Ping all connections periodically to check health
    setInterval(() =>{
        wss.clients.forEach((ws) =>{
            if(!ws.isAlive){
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping(null, false, true);
        })
    },30000)
}


// Emit to a specific driver
function emitToDriver(driverId,event,data){
    const ws = activeConnection.get(driverId.toString());
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
    } else {
        createPushNotification(driverId, event, data);
    }    
}


// Emit to a specific user
function emitToUser(userId, event, data) {
    const ws = activeConnection.get(userId.toString());
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
    }
}

// Fallback push notification service
async function createPushNotification(userId, event, data) {
    // Implementation would use Firebase Cloud Messaging or similar
    console.log(`Sending push notification for ${event} to ${userId}`);
}

module.exports = {
    initSocketServer,
    emitToDriver,
    emitToUser
};