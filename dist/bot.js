"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const log_1 = require("./log");
const welcome_1 = require("./welcome");
const version_info_json_1 = __importDefault(require("../version_info.json"));
// Cast versionInfoJson to the defined type
const versionInfo = version_info_json_1.default;
// Flag to enable/disable !pfp command for everyone
let pfpAnyoneEnabled = false;
// Create a new Discord client instance
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent
    ]
});
client.once('ready', () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get the first guild (server) the bot is in
        const guild = client.guilds.cache.first();
        if (!guild) {
            console.error('No guild found during startup.');
            return;
        }
        // Fetch version description and changelog link from version_info.json
        const versionDetails = versionInfo[config_1.VERSION];
        const changelogUrl = versionDetails ? versionDetails.changelog_url : '';
        const versionDescription = versionDetails ? versionDetails.description : 'No description available.';
        // Construct the startup message
        const startupMessage = `Bot is online! Version: [${config_1.VERSION}](${changelogUrl}). Total users welcomed so far: ${welcome_1.welcomeCount}. Wildcard chance: ${(0, config_1.getWILDCARD)()}% - ${versionDescription}`;
        // Log the startup message
        yield (0, log_1.logMessage)(client, guild, startupMessage);
    }
    catch (error) {
        console.error('Error during ready event:', error instanceof Error ? error.message : String(error));
    }
}));
client.on('guildMemberAdd', (member) => __awaiter(void 0, void 0, void 0, function* () {
    // Welcome new member
    yield (0, welcome_1.welcomeUser)(client, member);
}));
client.on('messageCreate', (message) => __awaiter(void 0, void 0, void 0, function* () {
    const guild = message.guild;
    const content = message.content;
    if (!guild)
        return;
    // Only process commands in #botspam or #general
    if (message.channel.id === config_1.BOTSPAM_CHANNEL_ID || message.channel.id === config_1.GENERAL_CHANNEL_ID) {
        if (message.channel.id === config_1.BOTSPAM_CHANNEL_ID) {
            if (config_1.DEBUG)
                console.log(`Received message in botspam: ${content}`);
            // Toggle the pfp-anyone flag
            if (content.startsWith('!pfp-anyone')) {
                pfpAnyoneEnabled = !pfpAnyoneEnabled;
                yield (0, log_1.logMessage)(client, guild, `!pfp command for everyone is now ${pfpAnyoneEnabled ? 'enabled' : 'disabled'}.`);
            }
            // Manual welcome trigger
            else if (content.startsWith('!welcome')) {
                const args = content.split(' ');
                if (args.length === 2) {
                    const username = args[1];
                    const member = guild.members.cache.find(member => member.user.username.toLowerCase() === username.toLowerCase());
                    if (member) {
                        yield (0, welcome_1.welcomeUser)(client, member);
                    }
                    else {
                        yield (0, log_1.logMessage)(client, guild, `User ${username} not found.`);
                    }
                }
                else {
                    yield (0, log_1.logMessage)(client, guild, 'Usage: !welcome <username>');
                }
            }
            // Wildcard command
            else if (content.startsWith('!wildcard')) {
                const args = content.split(' ');
                if (args.length === 2) {
                    const value = parseInt(args[1], 10);
                    if (!isNaN(value) && value >= 0 && value <= 99) {
                        (0, config_1.setWILDCARD)(value);
                        yield (0, log_1.logMessage)(client, guild, `Wildcard chance set to ${value}%`);
                    }
                    else {
                        yield (0, log_1.logMessage)(client, guild, 'Wildcard value must be between 0 and 99.');
                    }
                }
                else {
                    yield (0, log_1.logMessage)(client, guild, 'Usage: !wildcard <value>');
                }
            }
        }
        // Process pfp command in #general if allowed
        if (message.channel.id === config_1.GENERAL_CHANNEL_ID) {
            if (content.startsWith('!pfp') && pfpAnyoneEnabled) {
                const args = content.split(' ');
                if (args.length === 2) {
                    const username = args[1];
                    const member = guild.members.cache.find(member => member.user.username.toLowerCase() === username.toLowerCase());
                    if (member) {
                        yield (0, welcome_1.generateProfilePicture)(client, member);
                    }
                    else {
                        yield (0, log_1.logMessage)(client, guild, `User ${username} not found.`);
                    }
                }
                else {
                    yield (0, log_1.logMessage)(client, guild, 'Usage: !pfp <username>');
                }
            }
            else if (content.startsWith('!pfp') && !pfpAnyoneEnabled) {
                yield (0, log_1.logMessage)(client, guild, 'The !pfp command is currently disabled for general users.');
            }
        }
    }
}));
// Log in to Discord
client.login(config_1.DISCORD_BOT_TOKEN);
