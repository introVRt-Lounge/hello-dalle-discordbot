const { BOTSPAM_CHANNEL_ID } = require('./config');

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
        const firstGuild = client.guilds.cache.first();
        if (firstGuild) {
            const botSpamChannel = firstGuild.channels.cache.get(BOTSPAM_CHANNEL_ID);
            if (botSpamChannel) {
                await botSpamChannel.send(message);
            } else {
                console.warn(`Bot spam channel with ID ${BOTSPAM_CHANNEL_ID} not found`);
            }
        } else {
            console.warn('No guilds available to log message');
        }
    }
}

module.exports = {
    logMessage
};
