const { Client, GatewayIntentBits } = require('discord.js');
const { DISCORD_BOT_TOKEN, VERSION } = require('./config');
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
        await logMessage(client, guild, `Bot is online! Version: ${VERSION}. Total users welcomed so far: ${welcomeCount}`);
    } catch (error) {
        console.error('Error during ready event:', error);
    }
});

client.on('guildMemberAdd', async member => {
    await welcomeUser(client, member);
});

client.on('messageCreate', async message => {
    if (message.channel.id === BOTSPAM_CHANNEL_ID && message.content.startsWith('!welcome')) {
        const args = message.content.split(' ');
        if (args.length === 2) {
            const username = args[1];
            const guild = message.guild;
            const member = guild.members.cache.find(member => member.user.username.toLowerCase() === username.toLowerCase());
            if (member) {
                await welcomeUser(client, member);
            } else {
                await logMessage(client, message.guild, `User ${username} not found.`);
            }
        } else {
            await logMessage(client, message.guild, 'Usage: !welcome <username>');
        }
    }
});

client.login(DISCORD_BOT_TOKEN);
