import * as config from '../config';

describe('Config Tests', () => {
    test('All config values should be defined', () => {
        expect(config.DISCORD_BOT_TOKEN).toBeDefined();
        expect(config.OPENAI_API_KEY).toBeDefined();
        expect(config.BOTSPAM_CHANNEL_ID).toBeDefined();
        expect(config.WELCOME_CHANNEL_ID).toBeDefined();
        expect(config.PROFILE_CHANNEL_ID).toBeDefined();
        expect(config.BOT_USER_ROLE).toBeDefined();
        expect(config.WELCOME_PROMPT).toBeDefined();
        expect(config.WILDCARD).toBeDefined();
        expect(config.VERSION).toBeDefined();
    });

    test('Config WILDCARD should be a valid number between 0 and 99', () => {
        expect(typeof config.WILDCARD).toBe('number');
        expect(config.WILDCARD).toBeGreaterThanOrEqual(0);
        expect(config.WILDCARD).toBeLessThanOrEqual(99);
    });
});
