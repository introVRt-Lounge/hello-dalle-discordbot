require('dotenv').config();

let wildcard = parseInt(process.env.WILDCARD, 10) || 0;

module.exports = {
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    BOTSPAM_CHANNEL_ID: process.env.BOTSPAM_CHANNEL_ID,
    WELCOME_CHANNEL_NAME: process.env.WELCOME_CHANNEL_NAME,
    WELCOME_PROMPT: process.env.WELCOME_PROMPT,
    get WILDCARD() {
        return wildcard;
    },
    setWILDCARD(value) {
        if (value >= 0 && value <= 99) {
            wildcard = value;
        } else {
            throw new Error("WILDCARD value must be between 0 and 99.");
        }
    },
    VERSION: require('./package.json').version,
    DEBUG: process.env.DEBUG === 'true'
};
