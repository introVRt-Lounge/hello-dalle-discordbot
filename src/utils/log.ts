import { Client, Guild, TextChannel } from 'discord.js';
import { BOTSPAM_CHANNEL_ID, DEBUG } from '../config';

// Centralized logging function that supports both message content and files
export async function logMessage(
    client: Client, 
    guild: Guild, 
    message: string | { content?: string; files?: string[] }
): Promise<void> {
    const botSpamChannel = guild.channels.cache.get(BOTSPAM_CHANNEL_ID) as TextChannel;

    if (botSpamChannel?.isTextBased()) {
        if (typeof message === 'string') {
            await botSpamChannel.send(message);
        } else {
            const { content = '', files = [] } = message;
            await botSpamChannel.send({ content, files });
        }
    } else {
        if (DEBUG) console.warn('Botspam channel not found or is not text-based.');
    }
}
