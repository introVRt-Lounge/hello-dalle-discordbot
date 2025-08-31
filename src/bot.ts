import { Client, GatewayIntentBits, Guild, GuildMember, Message, CommandInteraction, ChatInputCommandInteraction } from 'discord.js';
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
import { readWelcomeCount } from './utils/appUtils';

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

        // Read the welcome count from the file
        const welcomeCount = readWelcomeCount();

        // Construct the startup message
        const startupMessage = `Bot is online! Version: ${VERSION}. Wildcard chance: ${getWILDCARD()}%. Total welcomed users so far: ${welcomeCount}`;

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
    try {
        if (interaction.isAutocomplete()) {
            // Handle autocomplete interactions for commands that need username autocomplete
            if (interaction.commandName === 'welcome' || interaction.commandName === 'pfp') {
                const focusedOption = interaction.options.getFocused(true);
                if (focusedOption.name === 'username') {
                    const guild = interaction.guild;
                    if (!guild) return;

                    try {
                        // Fetch all members
                        const members = await guild.members.fetch();
                        const userInput = focusedOption.value.toLowerCase();

                        // Filter members based on user input
                        const filteredMembers = members
                            .filter(member =>
                                member.user.username.toLowerCase().includes(userInput) ||
                                (member.displayName && member.displayName.toLowerCase().includes(userInput))
                            );

                        // Convert to array and limit to 25 options (Discord limit)
                        const limitedMembers = Array.from(filteredMembers.values()).slice(0, 25);

                        // Create autocomplete choices - show display name but use username as value
                        const choices = limitedMembers.map((member: GuildMember) => ({
                            name: member.displayName || member.user.username,
                            value: member.user.username
                        }));

                        await interaction.respond(choices);
                    } catch (error) {
                        console.error('Error fetching members for autocomplete:', error);
                        await interaction.respond([]);
                    }
                }
            }
        } else if (interaction.isCommand()) {
            // Handle slash commands
            const { commandName } = interaction;

            switch (commandName) {
                            case 'pfp':
                await handlePfpSlashCommand(client, interaction as ChatInputCommandInteraction, isPfpAnyoneEnabled());
                break;
            case 'pfp-anyone':
                await pfpAnyoneSlashCommand(client, interaction as ChatInputCommandInteraction);
                break;
            case 'welcome':
                await welcomeSlashCommand(client, interaction as ChatInputCommandInteraction);
                break;
            case 'wildcard':
                await handleWildcardSlashCommand(client, interaction as ChatInputCommandInteraction);
                break;
                default:
                    await interaction.reply({ content: 'Unknown command.', ephemeral: true });
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (interaction.isAutocomplete()) {
            try {
                await interaction.respond([]);
            } catch (e) {
                // Ignore errors in autocomplete
            }
        } else if (interaction.isCommand() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `An error occurred while processing the command: ${errorMessage}`,
                ephemeral: true
            });
        }
    }
});

// Log in to Discord
client.login(DISCORD_BOT_TOKEN);
