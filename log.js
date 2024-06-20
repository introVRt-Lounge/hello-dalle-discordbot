const { BOTSPAM_CHANNEL_ID } = require('./config');
const fs = require('fs');

async function logMessage(client, guild, message) {
    console.log(message);
    if (guild) {
        const botSpamChannel = guild.channels.cache.get(BOTSPAM_CHANNEL_ID);
        if (botSpamChannel) {
            await botSpamChannel.send(message);
        } else {
            console.warn(`Bot spam channel with ID ${BOTSPAM_CHANNEL_ID} not found`);
        }
    } else {
        console.warn('Guild object is null');
    }
}

module.exports = {
    logMessage
};
