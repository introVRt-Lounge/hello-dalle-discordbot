import { Client, Message } from 'discord.js';
import { getWILDCARD, setWILDCARD } from '../config';
import { logMessage } from '../utils/log';

// Handle the wildcard command
export async function handleWildcardCommand(client: Client, message: Message): Promise<void> {
    const guild = message.guild;
    const content = message.content;
    const args = content.split(' ');

    if (!guild) return;

    // Expecting command format: !wildcard <value>
    if (args.length === 2) {
        const value = parseInt(args[1], 10);

        // Validate the input
        if (!isNaN(value) && value >= 0 && value <= 99) {
            setWILDCARD(value); // Set the new wildcard value
            await logMessage(client, guild, `Wildcard chance set to ${value}%`);
        } else {
            await logMessage(client, guild, 'Wildcard value must be between 0 and 99.');
        }
    } else {
        await logMessage(client, guild, 'Usage: !wildcard <value>');
    }
}
