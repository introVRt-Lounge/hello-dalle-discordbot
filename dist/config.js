"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWILDCARD = exports.getWILDCARD = exports.VERSION = exports.DEBUG = exports.WILDCARD = exports.WELCOME_PROMPT = exports.WELCOME_CHANNEL_NAME = exports.GENERAL_CHANNEL_ID = exports.BOTSPAM_CHANNEL_ID = exports.OPENAI_API_KEY = exports.DISCORD_BOT_TOKEN = void 0;
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file, if present
(0, dotenv_1.config)();
// Export constants
exports.DISCORD_BOT_TOKEN = (_a = process.env.DISCORD_BOT_TOKEN) !== null && _a !== void 0 ? _a : '';
exports.OPENAI_API_KEY = (_b = process.env.OPENAI_API_KEY) !== null && _b !== void 0 ? _b : '';
exports.BOTSPAM_CHANNEL_ID = (_c = process.env.BOTSPAM_CHANNEL_ID) !== null && _c !== void 0 ? _c : '';
exports.GENERAL_CHANNEL_ID = (_d = process.env.GENERAL_CHANNEL_ID) !== null && _d !== void 0 ? _d : '';
exports.WELCOME_CHANNEL_NAME = (_e = process.env.WELCOME_CHANNEL_NAME) !== null && _e !== void 0 ? _e : '';
exports.WELCOME_PROMPT = (_f = process.env.WELCOME_PROMPT) !== null && _f !== void 0 ? _f : '';
exports.WILDCARD = parseInt((_g = process.env.WILDCARD) !== null && _g !== void 0 ? _g : '0', 10);
exports.DEBUG = process.env.DEBUG === 'true';
exports.VERSION = require(path_1.default.resolve(__dirname, '../package.json')).version;
// Manage WILDCARD as a variable with getter/setter
let wildcard = exports.WILDCARD;
const getWILDCARD = () => wildcard;
exports.getWILDCARD = getWILDCARD;
const setWILDCARD = (value) => {
    if (value >= 0 && value <= 99) {
        wildcard = value;
    }
    else {
        throw new Error("WILDCARD value must be between 0 and 99.");
    }
};
exports.setWILDCARD = setWILDCARD;
