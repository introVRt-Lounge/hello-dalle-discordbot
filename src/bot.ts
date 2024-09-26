import { Client, GatewayIntentBits, Guild, GuildMember, Message } from 'discord.js';
import { DISCORD_BOT_TOKEN, VERSION, BOTSPAM_CHANNEL_ID, getWILDCARD, DEBUG, GENERAL_CHANNEL_ID, setWILDCARD } from './config';
import { logMessage } from './log';
import { welcomeUser, welcomeCount, generateProfilePicture } from './welcome';
import versionInfoJson from '../version_info.json';

// Define the type for versionInfo
type VersionInfo = {
  [version: string]: {
    description: string;
    changelog_url: string;
  };
};

// Cast versionInfoJson to the defined type
const versionInfo: VersionInfo = versionInfoJson;

// Flag to enable/disable !pfp command for everyone
let pfpAnyoneEnabled = false;

// Create a new Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    try {
        // Get the first guild (server) the bot is in
        const guild: Guild | undefined = client.guilds.cache.first();

        if (!guild) {
            console.error('No guild found during startup.');
            return;
        }

        // Fetch version description and changelog link from version_info.json
        const versionDetails = versionInfo[VERSION as keyof typeof versionInfo];
        const changelogUrl: string = versionDetails ? versionDetails.changelog_url : '';
        const versionDescription: string = versionDetails ? versionDetails.description : 'No description available.';

        // Construct the startup message
        const startupMessage = `Bot is online! Version: [${VERSION}](${changelogUrl}). Total users welcomed so far: ${welcomeCount}. Wildcard chance: ${getWILDCARD()}% - ${versionDescription}`;

        // Log the startup message
        await logMessage(client, guild, startupMessage);
    } catch (error) {
        console.error('Error during ready event:', error instanceof Error ? error.message : String(error));
    }
});

client.on('guildMemberAdd', async (member: GuildMember) => {
    // Welcome new member
    await welcomeUser(client, member);
});

client.on('messageCreate', async (message: Message) => {
    const guild = message.guild;
    const content = message.content;

    if (!guild) return;

    // Only process commands in #botspam or #general
    if (message.channel.id === BOTSPAM_CHANNEL_ID || message.channel.id === GENERAL_CHANNEL_ID) {

        if (message.channel.id === BOTSPAM_CHANNEL_ID) {
            if (DEBUG) console.log(`Received message in botspam: ${content}`);

            // Toggle the pfp-anyone flag
            if (content.startsWith('!pfp-anyone')) {
                pfpAnyoneEnabled = !pfpAnyoneEnabled;
                await logMessage(client, guild, `!pfp command for everyone is now ${pfpAnyoneEnabled ? 'enabled' : 'disabled'}.`);
            }

            // Manual welcome trigger
            else if (content.startsWith('!welcome')) {
                const args = content.split(' ');
                if (args.length === 2) {
                    const username = args[1];
                    const member = guild.members.cache.find(member => member.user.username.toLowerCase() === username.toLowerCase());
                    if (member) {
                        await welcomeUser(client, member);
                    } else {
                        await logMessage(client, guild, `User ${username} not found.`);
                    }
                } else {
                    await logMessage(client, guild, 'Usage: !welcome <username>');
                }
            }

            // Wildcard command
            else if (content.startsWith('!wildcard')) {
                const args = content.split(' ');
                if (args.length === 2) {
                    const value = parseInt(args[1], 10);
                    if (!isNaN(value) && value >= 0 && value <= 99) {
                        setWILDCARD(value);
                        await logMessage(client, guild, `Wildcard chance set to ${value}%`);
                    } else {
                        await logMessage(client, guild, 'Wildcard value must be between 0 and 99.');
                    }
                } else {
                    await logMessage(client, guild, 'Usage: !wildcard <value>');
                }
            }
        }

        // Process pfp command in #general if allowed
        if (message.channel.id === GENERAL_CHANNEL_ID) {
            if (content.startsWith('!pfp') && pfpAnyoneEnabled) {
                const args = content.split(' ');
                if (args.length === 2) {
                    const username = args[1];
                    const member = guild.members.cache.find(member => member.user.username.toLowerCase() === username.toLowerCase());
                    if (member) {
                        await generateProfilePicture(client, member);
                    } else {
                        await logMessage(client, guild, `User ${username} not found.`);
                    }
                } else {
                    await logMessage(client, guild, 'Usage: !pfp <username>');
                }
            } else if (content.startsWith('!pfp') && !pfpAnyoneEnabled) {
                await logMessage(client, guild, 'The !pfp command is currently disabled for general users.');
            }
        }
    }
});

// Log in to Discord
client.login(DISCORD_BOT_TOKEN);
