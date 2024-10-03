import { Client, Message } from 'discord.js';
import { logMessage } from '../utils/log';

let pfpAnyoneEnabled = false; // Move the flag here

export async function pfpAnyoneCommand(client: Client, message: Message): Promise<void> {
    const guild = message.guild;

    if (!guild) return;

    // Toggle the pfp-anyone flag
    pfpAnyoneEnabled = !pfpAnyoneEnabled;
    await logMessage(client, guild, `!pfp command for everyone is now ${pfpAnyoneEnabled ? 'enabled' : 'disabled'}.`);
}

// Add this helper function to get the current state of pfp-anyone
export function isPfpAnyoneEnabled(): boolean {
    return pfpAnyoneEnabled;
}
