import { config as loadEnv } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file, if present and not in CI/test environment
if (!process.env.CI && !process.env.NODE_ENV?.includes('test') && fs.existsSync(path.resolve(__dirname, '../.env'))) {
    loadEnv();
}

// Helper function to ensure env variables are set
function checkEnvVar(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`Environment variable ${name} is not set!`);
    }
    return value;
}

// Export constants with checks for required variables
export const POSTING_DELAY = parseInt(process.env.POSTING_DELAY || '120', 10); // Default to 120 seconds (2 minutes)
export const DISCORD_BOT_TOKEN = checkEnvVar('DISCORD_BOT_TOKEN', process.env.DISCORD_BOT_TOKEN);
export const OPENAI_API_KEY = checkEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
export const BOTSPAM_CHANNEL_ID = checkEnvVar('BOTSPAM_CHANNEL_ID', process.env.BOTSPAM_CHANNEL_ID);
export const WELCOME_CHANNEL_ID = checkEnvVar('WELCOME_CHANNEL_ID', process.env.WELCOME_CHANNEL_ID);
export const PROFILE_CHANNEL_ID = checkEnvVar('PROFILE_CHANNEL_ID', process.env.PROFILE_CHANNEL_ID);
export const WELCOME_PROMPT = checkEnvVar('WELCOME_PROMPT', process.env.WELCOME_PROMPT);
export const BOT_USER_ROLE = checkEnvVar('BOT_USER_ROLE', process.env.BOT_USER_ROLE);

// Optional variables with default values
export const WILDCARD = parseInt(process.env.WILDCARD ?? '0', 10);
export const DEBUG = process.env.DEBUG === 'true' || false; // Default DEBUG to false
export const VERSION = require(path.resolve(__dirname, '../package.json')).version;
export const WATERMARK_PATH = process.env.WATERMARK_PATH || undefined; // Optional watermark path
export const STEALTH_WELCOME = process.env.STEALTH_WELCOME === 'true' || false; // Default STEALTH_WELCOME to false
export const GENDER_SENSITIVITY = process.env.GENDER_SENSITIVITY === 'true' || false; // Default GENDER_SENSITIVITY to false

// Manage WILDCARD as a variable with getter/setter
let wildcard = WILDCARD;

export const getWILDCARD = (): number => wildcard;
export const setWILDCARD = (value: number): void => {
    if (value >= 0 && value <= 99) {
        wildcard = value;
    } else {
        throw new Error("WILDCARD value must be between 0 and 99.");
}};
