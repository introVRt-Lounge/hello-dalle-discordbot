import * as config from '../config';

describe('Config Tests', () => {
    test('All config values should be defined', () => {
        expect(config.DISCORD_BOT_TOKEN).toBeDefined();
        expect(config.OPENAI_API_KEY).toBeDefined();
        expect(config.BOTSPAM_CHANNEL_ID).toBeDefined();
        expect(config.WELCOME_CHANNEL_NAME).toBeDefined();
        expect(config.GENERAL_CHANNEL_ID).toBeDefined();
        expect(config.WILDCARD).toBeDefined();
        expect(config.VERSION).toBeDefined();
        expect(config.DEBUG).toBeDefined();
    });
});
