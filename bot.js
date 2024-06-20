const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const { logMessage } = require('./log');
const { welcomeUser, welcomeCount } = require('./welcome');

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
        await logMessage(client, guild, `Bot is online! Version: ${config.VERSION}. Total users welcomed so far: ${welcomeCount}. Wildcard chance: ${config.WILDCARD}%`);
    } catch (error) {
        console.error('Error during ready event:', error);
    }
});

client.on('guildMemberAdd', async member => {
    await welcomeUser(client, member);
});

client.on('messageCreate', async message => {
    if (message.channel.id === config.BOTSPAM_CHANNEL_ID) {
        if (message.content.startsWith('!welcome')) {
            const args = message.content.split(' ');
            if (args.length === 2) {
                const username = args[1].toLowerCase();
                const guild = message.guild;
                try {
                    await guild.members.fetch(); // Ensure the member list is up-to-date
                    const member = guild.members.cache.find(member => member.user.username.toLowerCase() === username);
                    if (member) {
                        await welcomeUser(client, member);
                    } else {
                        await logMessage(client, message.guild, `User ${username} not found.`);
                    }
                } catch (error) {
                    await logMessage(client, message.guild, `Error fetching members: ${error.message}`);
                }
            } else {
                await logMessage(client, message.guild, 'Usage: !welcome <username>');
            }
        } else if (message.content.startsWith('!wildcard')) {
            const args = message.content.split(' ');
            if (args.length === 2) {
                const newWildcardValue = parseInt(args[1], 10);
                if (isNaN(newWildcardValue) || newWildcardValue < 0 || newWildcardValue > 99) {
                    await logMessage(client, message.guild, 'Error: Wildcard value must be a number between 0 and 99.');
                } else {
                    try {
                        config.WILDCARD = newWildcardValue;
                        await logMessage(client, message.guild, `Wildcard chance updated to ${config.WILDCARD}%.`);
                    } catch (error) {
                        await logMessage(client, message.guild, `Error: ${error.message}`);
                    }
                }
            } else {
                await logMessage(client, message.guild, 'Usage: !wildcard <value>');
            }
        }
    }
});

client.login(config.DISCORD_BOT_TOKEN);
