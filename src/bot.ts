import { Client, GatewayIntentBits, Guild, GuildMember, Message, CommandInteraction } from 'discord.js';
import {
    welcomeCommand,
    welcomeNewMember,
    handleWildcardCommand,
    handlePfpCommand,
    pfpAnyoneCommand,
    isPfpAnyoneEnabled
} from './commands'; // Importing all commands from the barrel
import { handlePfpSlashCommand } from './commands/pfp';
import { pfpAnyoneSlashCommand } from './commands/pfp-anyone';
import { welcomeSlashCommand } from './commands/welcome';
import { handleWildcardSlashCommand } from './commands/wildcard';
import { registerSlashCommands } from './commands/slashCommands';
import { DISCORD_BOT_TOKEN, VERSION, BOTSPAM_CHANNEL_ID, getWILDCARD, DEBUG, WELCOME_CHANNEL_ID, PROFILE_CHANNEL_ID } from './config';
import { logMessage } from './utils/log';
import versionInfoJson from '../version_info.json';
import { readWelcomeCount } from './utils/appUtils';

// Define the type for versionInfo
type VersionInfo = {
  [version: string]: {
    description: string;
    changelog_url: string;
  };
};

// Cast versionInfoJson to the defined type
const versionInfo: VersionInfo = versionInfoJson;

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

        // Register slash commands
        await registerSlashCommands(client);

        // Fetch version description and changelog link from version_info.json
        const versionDetails = versionInfo[VERSION as keyof typeof versionInfo];
        const changelogUrl: string = versionDetails ? versionDetails.changelog_url : '';
        const versionDescription: string = versionDetails ? versionDetails.description : 'No description available.';

        // Read the welcome count from the file
        const welcomeCount = readWelcomeCount();

        // Construct the startup message
        const startupMessage = `Bot is online! Version: [${VERSION}](${changelogUrl}). Wildcard chance: ${getWILDCARD()}% - ${versionDescription}. Total welcomed users so far: ${welcomeCount}`;

        // Log the startup message
        await logMessage(client, guild, startupMessage);
        console.log(`DEBUG mode is set to: ${DEBUG}`);
    } catch (error) {
        console.error('Error during ready event:', error instanceof Error ? error.message : String(error));
    }
});

// Handle new guild member joining
client.on('guildMemberAdd', async (member: GuildMember) => {
    // Welcome new member
    await welcomeNewMember(client, member);
});

client.on('messageCreate', async (message: Message) => {
    const guild = message.guild;
    const content = message.content;

    if (!guild) return;

    // Only process commands in #botspam or the defined welcome and profile channels
    if (message.channel.id === BOTSPAM_CHANNEL_ID || message.channel.id === WELCOME_CHANNEL_ID || message.channel.id === PROFILE_CHANNEL_ID) {

        // !pfp can be triggered from either location, process if allowed
        if (content.startsWith('!pfp')) {
            console.log(`Processing !pfp command in channel: ${message.channel.id}`);
            await handlePfpCommand(client, message, isPfpAnyoneEnabled());
        }

        //only from #botspam channel
        if (message.channel.id === BOTSPAM_CHANNEL_ID) {
            if (DEBUG) console.log(`Received message in botspam: ${content}`);

            // Toggle the pfp-anyone flag
            if (content.startsWith('!pfp-anyone')) {
                await pfpAnyoneCommand(client, message);
            }

            // Manual welcome trigger
            else if (content.startsWith('!welcome')) {
                await welcomeCommand(client, message);
            }

            // Wildcard command
            else if (content.startsWith('!wildcard')) {
                await handleWildcardCommand(client, message);
            }
        }
    }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'pfp':
                await handlePfpSlashCommand(client, interaction, isPfpAnyoneEnabled());
                break;
            case 'pfp-anyone':
                await pfpAnyoneSlashCommand(client, interaction);
                break;
            case 'welcome':
                await welcomeSlashCommand(client, interaction);
                break;
            case 'wildcard':
                await handleWildcardSlashCommand(client, interaction);
                break;
            default:
                await interaction.reply({ content: 'Unknown command.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling slash command:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `An error occurred while processing the command: ${errorMessage}`,
                ephemeral: true
            });
        }
    }
});

// Log in to Discord
client.login(DISCORD_BOT_TOKEN);
