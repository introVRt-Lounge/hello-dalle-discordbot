import { Client, Guild, TextChannel } from 'discord.js';
import { BOTSPAM_CHANNEL_ID } from '../src/config';

/**
 * Logs a message to the bot spam channel of the specified guild.
 * If the guild is not provided, logs the message to the first available guild's bot spam channel.
 *
 * @param client - The Discord client instance.
 * @param guild - The guild where the message will be logged. Optional.
 * @param message - The message to be logged, can be a string or an object with content and files.
 */
export async function logMessage(
    client: Client, 
    guild: Guild | null, 
    message: string | { content?: string; files?: string[] }
): Promise<void> {
    console.log(message);

    const getBotSpamChannel = (guild: Guild): TextChannel | undefined => {
        const channel = guild.channels.cache.get(BOTSPAM_CHANNEL_ID);
        return channel?.isTextBased() ? (channel as TextChannel) : undefined;
    };

    const botSpamChannel = guild ? getBotSpamChannel(guild) : getBotSpamChannel(client.guilds.cache.first()!);

    if (!botSpamChannel) {
        console.warn(`Bot spam channel with ID ${BOTSPAM_CHANNEL_ID} not found or not text-based`);
        return;
    }

    if (typeof message === 'string') {
        await botSpamChannel.send(message);
    } else {
        const { content = '', files = [] } = message;
        await botSpamChannel.send({ content, files });
    }
}
