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

// Logger class that wraps the logMessage function for structured logging
export class Logger {
    private static client: Client | null = null;
    private static guild: Guild | null = null;

    static setContext(client: Client, guild: Guild): void {
        this.client = client;
        this.guild = guild;
    }

    static async info(message: string): Promise<void> {
        console.log(`[INFO] ${message}`);
        if (this.client && this.guild) {
            await logMessage(this.client, this.guild, `[INFO] ${message}`);
        }
    }

    static async warning(message: string): Promise<void> {
        console.warn(`[WARNING] ${message}`);
        if (this.client && this.guild) {
            await logMessage(this.client, this.guild, `[WARNING] ${message}`);
        }
    }

    static async warn(message: string): Promise<void> {
        await this.warning(message);
    }

    static async error(message: string): Promise<void> {
        console.error(`[ERROR] ${message}`);
        if (this.client && this.guild) {
            await logMessage(this.client, this.guild, `[ERROR] ${message}`);
        }
    }

    static async debug(message: string): Promise<void> {
        if (DEBUG) {
            console.log(`[DEBUG] ${message}`);
            if (this.client && this.guild) {
                await logMessage(this.client, this.guild, `[DEBUG] ${message}`);
            }
        }
    }
}
