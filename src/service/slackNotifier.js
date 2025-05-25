const { IncomingWebhook } = require('@slack/webhook')
const config = require('../config/config')

exports.slackNotifier = async (priority, driverEmail) => {
    const priorityMessages = {
        normal: `🟢 New reactivation request from ${driverEmail}`,
        high: `🟠 HIGH priority request from ${driverEmail}`,
        critical: `🔴 CRITICAL! Immediate action needed for ${driverEmail}`
    }

    const payload = {
        text: priorityMessages[priority] || priorityMessages.normal,
        fields: [
            { title: 'Priority', value: priority.toUpperCase(), short: true },
            { title: 'Time', value: new Date().toLocaleString(), short: true }
        ]
    }

    try {
        const webhook = new IncomingWebhook(config.SLACK_WEBHOOK_URL)
        await webhook.send(payload)
    } catch (error) {
        console.error('Slack notification failed:', error.message)
    }
}
