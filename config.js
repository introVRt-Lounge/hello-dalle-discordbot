require('dotenv').config();

module.exports = {
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    BOTSPAM_CHANNEL_ID: process.env.BOTSPAM_CHANNEL_ID,
    WELCOME_CHANNEL_NAME: process.env.WELCOME_CHANNEL_NAME,
    WELCOME_PROMPT: process.env.WELCOME_PROMPT,
    WILDCARD: parseInt(process.env.WILDCARD, 10) || 0,
    VERSION: require('./package.json').version
};
