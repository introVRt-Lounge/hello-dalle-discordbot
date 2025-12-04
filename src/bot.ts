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
import { handleEngineSlashCommand } from './commands/engine';
import { registerSlashCommands } from './commands/slashCommands';
import { DISCORD_BOT_TOKEN, VERSION, BOTSPAM_CHANNEL_ID, getWILDCARD, DEBUG, WELCOME_CHANNEL_ID, PROFILE_CHANNEL_ID } from './config';
import { logMessage } from './utils/log';
import { readWelcomeCount } from './utils/appUtils';
import { CostMonitoringService } from './services/costMonitoringService';

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

        // Initialize cost monitoring service
        const costService = new CostMonitoringService(client);

        // Register slash commands
        await registerSlashCommands(client);

        // Read the welcome count from the file
        const welcomeCount = readWelcomeCount();

        // Get human member count (exclude bots)
        const humanMemberCount = guild.members.cache.filter(member => !member.user.bot).size;

        // Construct the startup message
        const startupMessage = `Bot is online! Version: ${VERSION}. Wildcard chance: ${getWILDCARD()}%. Total welcomed users so far: ${welcomeCount}. Active human members: ${humanMemberCount}`;

        // Log the startup message
        await logMessage(client, guild, startupMessage);
        console.log(`DEBUG mode is set to: ${DEBUG}`);

        // Send cost report to botspam channel (async, don't wait)
        costService.sendCostReport().catch(error => {
            console.warn('Failed to send cost report at startup:', error);
        });

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
                        const userInput = focusedOption.value.toLowerCase();

                        // First, try to use cached members for immediate response
                        let allMembers = guild.members.cache;

                        // If user input is not empty and we have few cached results, try to fetch more
                        // But implement a timeout to avoid hanging
                        if (userInput.length > 0) {
                            const cachedFiltered = allMembers.filter(member =>
                                member.user.username.toLowerCase().includes(userInput) ||
                                (member.displayName && member.displayName.toLowerCase().includes(userInput))
                            );

                            // If we have less than 10 cached results, try to fetch more members
                            if (cachedFiltered.size < 10) {
                                try {
                                    // Create a promise that rejects after 2 seconds
                                    const timeoutPromise = new Promise((_, reject) =>
                                        setTimeout(() => reject(new Error('GuildMembersTimeout')), 2000)
                                    );

                                    // Race between fetching members and timeout
                                    const fetchPromise = guild.members.fetch();
                                    allMembers = await Promise.race([fetchPromise, timeoutPromise]) as typeof allMembers;
                                } catch (fetchError) {
                                    // If fetch times out, use cached members only
                                    console.error('Error fetching members for autocomplete:', fetchError);
                                    allMembers = guild.members.cache;
                                }
                            }
                        }

                        // Filter members based on user input
                        const filteredMembers = allMembers
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
                        console.error('Error handling autocomplete:', error);
                        // Always try to respond with empty array as fallback
                        try {
                            await interaction.respond([]);
                        } catch (respondError) {
                            // Ignore respond errors in catch block to avoid infinite loops
                            console.error('Error responding to autocomplete:', respondError);
                        }
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
            case 'engine':
                await handleEngineSlashCommand(client, interaction as ChatInputCommandInteraction);
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
