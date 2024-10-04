import { config as loadEnv } from 'dotenv';
import path from 'path';

// Load environment variables from .env file, if present
loadEnv();

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
export const GENERAL_CHANNEL_ID = checkEnvVar('GENERAL_CHANNEL_ID', process.env.GENERAL_CHANNEL_ID);
export const WELCOME_CHANNEL_NAME = checkEnvVar('WELCOME_CHANNEL_NAME', process.env.WELCOME_CHANNEL_NAME);
export const WELCOME_PROMPT = checkEnvVar('WELCOME_PROMPT', process.env.WELCOME_PROMPT);

// Optional variables with default values
export const WILDCARD = parseInt(process.env.WILDCARD ?? '0', 10);
export const DEBUG = process.env.DEBUG === 'true' || false; // Default DEBUG to false
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
