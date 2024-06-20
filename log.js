const { BOTSPAM_CHANNEL_ID } = require('./config');

async function logMessage(client, guild, message, context = 'general') {
    console.log(message);
    if (guild) {
        const botSpamChannel = guild.channels.cache.get(BOTSPAM_CHANNEL_ID);
        if (botSpamChannel) {
            let simplifiedMessage = message;

            // Simplify the message for botspam channel
            if (context === 'welcome') {
                if (message.includes('Triggering welcome process for:')) {
                    const username = message.match(/Triggering welcome process for: (.*?),/)[1];
                    simplifiedMessage = `Triggering welcome for "${username}"`;
                } else if (message.includes('Avatar URL:')) {
                    const avatarUrl = message.split('Avatar URL: ')[1];
                    simplifiedMessage = { files: [avatarUrl] };
                } else if (message.includes('Full prompt for DALL-E:')) {
                    simplifiedMessage = message.replace('Full prompt for DALL-E:', 'Prompt:');
                } else if (message.includes('DALL-E image downloaded to')) {
                    const imagePath = message.split('DALL-E image downloaded to ')[1];
                    simplifiedMessage = { files: [imagePath] };
                } else if (message.includes('Total users welcomed:')) {
                    simplifiedMessage = message;
                }
            }

            await botSpamChannel.send(simplifiedMessage).catch(console.error);
        } else {
            console.warn(`Bot spam channel with ID ${BOTSPAM_CHANNEL_ID} not found`);
        }
    } else {
        console.warn('Guild object is null');
    }
}

module.exports = { logMessage };
