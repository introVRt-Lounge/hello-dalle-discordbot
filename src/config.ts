import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
if (process.env.NODE_ENV?.includes('test')) {
    // In test environment, load test-specific env vars
    loadEnv({ path: path.resolve(__dirname, '../.env.test') });
} else if (!process.env.CI && fs.existsSync(path.resolve(__dirname, '../.env'))) {
    // In development, load .env file if present
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
export const BOTSPAM_CHANNEL_ID = checkEnvVar('BOTSPAM_CHANNEL_ID', process.env.BOTSPAM_CHANNEL_ID);
export const WELCOME_CHANNEL_ID = checkEnvVar('WELCOME_CHANNEL_ID', process.env.WELCOME_CHANNEL_ID);
export const PROFILE_CHANNEL_ID = checkEnvVar('PROFILE_CHANNEL_ID', process.env.PROFILE_CHANNEL_ID);
export const WELCOME_PROMPT = checkEnvVar('WELCOME_PROMPT', process.env.WELCOME_PROMPT);
export const BOT_USER_ROLE = checkEnvVar('BOT_USER_ROLE', process.env.BOT_USER_ROLE);

// Optional variables with default values
export const WILDCARD = parseInt(process.env.WILDCARD ?? '0', 10);
export const DEBUG = process.env.DEBUG === 'true' || false; // Default DEBUG to false
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Optional: for Gemini image generation
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // For DALL-E image generation (cost monitoring not available via API)
export const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID; // Optional: for Gemini cost monitoring

// Get version from version.txt - no fallback, must exist
const versionPath = path.resolve(__dirname, '../version.txt');
if (!fs.existsSync(versionPath)) {
  throw new Error('version.txt not found! This indicates a build issue. Version file must be present for proper versioning.');
}

let version: string;
try {
  version = fs.readFileSync(versionPath, 'utf8').trim();
  if (!version) {
    throw new Error('version.txt is empty!');
  }
} catch (error) {
  throw new Error(`Failed to read version.txt: ${error}`);
}

export const VERSION = version;

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

// Define ImageEngine type locally to avoid circular imports
export type ImageEngine = 'dalle' | 'gemini';

// Manage DEFAULT_ENGINE as a variable with getter/setter
let defaultEngine: ImageEngine = (process.env.DEFAULT_ENGINE as ImageEngine) || 'dalle';

// Validate that the default engine has required API keys
if (defaultEngine === 'dalle' && !OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: DEFAULT_ENGINE is set to "dalle" but OPENAI_API_KEY is not configured.');
    console.warn('⚠️  Switching default engine to "gemini" for image generation.');
    console.warn('💡 To use DALL-E as default, set OPENAI_API_KEY environment variable.');
    defaultEngine = 'gemini';
} else if (defaultEngine === 'gemini' && !GEMINI_API_KEY) {
    console.warn('⚠️  WARNING: DEFAULT_ENGINE is set to "gemini" but GEMINI_API_KEY is not configured.');
    if (OPENAI_API_KEY) {
        console.warn('⚠️  Switching default engine to "dalle" for image generation.');
        defaultEngine = 'dalle';
    } else {
        console.error('❌ ERROR: Neither GEMINI_API_KEY nor OPENAI_API_KEY are configured!');
        console.error('❌ Please set at least one of GEMINI_API_KEY or OPENAI_API_KEY environment variables.');
        process.exit(1);
    }
}

export const getDEFAULT_ENGINE = (): ImageEngine => defaultEngine;
export const setDEFAULT_ENGINE = (value: ImageEngine): void => {
    if (value === 'dalle' || value === 'gemini') {
        defaultEngine = value;
    } else {
        throw new Error("DEFAULT_ENGINE must be either 'dalle' or 'gemini'.");
}};
