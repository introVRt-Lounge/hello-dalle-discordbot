import { config as loadEnv } from 'dotenv';
import path from 'path';

// Load environment variables from .env file, if present
loadEnv();

// Export constants
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
export const BOTSPAM_CHANNEL_ID = process.env.BOTSPAM_CHANNEL_ID ?? '';
export const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID ?? '';
export const WELCOME_CHANNEL_NAME = process.env.WELCOME_CHANNEL_NAME ?? '';
export const WELCOME_PROMPT = process.env.WELCOME_PROMPT ?? '';
export const WILDCARD = parseInt(process.env.WILDCARD ?? '0', 10);
export const DEBUG = process.env.DEBUG === 'true';
export const VERSION = require(path.resolve(__dirname, '../package.json')).version;

// Manage WILDCARD as a variable with getter/setter
let wildcard = WILDCARD;

export const getWILDCARD = (): number => wildcard;
export const setWILDCARD = (value: number): void => {
    if (value >= 0 && value <= 99) {
        wildcard = value;
    } else {
        throw new Error("WILDCARD value must be between 0 and 99.");
}};
