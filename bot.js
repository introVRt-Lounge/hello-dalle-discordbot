const { Client, GatewayIntentBits } = require('discord.js');
const { DISCORD_BOT_TOKEN, VERSION, BOTSPAM_CHANNEL_ID, WILDCARD, DEBUG } = require('./config');
const { logMessage } = require('./log');
const { welcomeUser, welcomeCount } = require('./welcome');
const versionInfo = require('./version_info.json');

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
        const guild = client.guilds.cache.first();

        // Fetch version description and changelog link from version_info.json
        const versionDetails = versionInfo[VERSION];
        const changelogUrl = versionDetails ? versionDetails.changelog_url : "";
        const versionDescription = versionDetails ? versionDetails.description : "No description available.";

        // Construct the startup message
        const startupMessage = `Bot is online! Version: [${VERSION}](${changelogUrl}). Total users welcomed so far: ${welcomeCount}. Wildcard chance: ${WILDCARD}% - ${versionDescription}`;

        await logMessage(client, guild, startupMessage);
    } catch (error) {
        console.error('Error during ready event:', error);
    }
});

client.on('guildMemberAdd', async member => {
    await welcomeUser(client, member);
});

client.on('messageCreate', async message => {
    if (message.channel.id === BOTSPAM_CHANNEL_ID) {
        if (DEBUG) console.log(`Received message: ${message.content}`); // Debug logging
        if (message.content.startsWith('!welcome')) {
            const args = message.content.split(' ');
            if (args.length === 2) {
                const username = args[1];
                const guild = message.guild;
                const member = guild.members.cache.find(member => member.user.username.toLowerCase() === username.toLowerCase());
                if (member) {
                    await welcomeUser(client, member);
                } else {
                    await logMessage(client, guild, `User ${username} not found.`);
                }
            } else {
                await logMessage(client, guild, 'Usage: !welcome <username>');
            }
        } else if (message.content.startsWith('!wildcard')) {
            const args = message.content.split(' ');
            if (args.length === 2) {
                const value = parseInt(args[1], 10);
                if (!isNaN(value) && value >= 0 && value <= 99) {
                    setWILDCARD(value);
                    await logMessage(client, message.guild, `Wildcard chance set to ${value}%`);
                } else {
                    await logMessage(client, message.guild, 'Wildcard value must be between 0 and 99.');
                }
            } else {
                await logMessage(client, guild, 'Usage: !wildcard <value>');
            }
        }
    }
});

client.login(DISCORD_BOT_TOKEN);
