import { Client, Message, PermissionsBitField } from 'discord.js';
import { generateProfilePicture } from '../services/pfpService';
import { logMessage } from '../utils/log';
import { DEBUG } from '../config';

// Modify handlePfpCommand to allow admins to run it from #botspam
export async function handlePfpCommand(client: Client, message: Message, pfpAnyoneEnabled: boolean): Promise<void> {
    const guild = message.guild;
    const content = message.content;
    const member = message.member; // Get the message author
    const args = content.split(' ');

    if (!guild || !member) return;

    // Check if the user is an admin
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

    // Log debug info
    if (DEBUG) console.log(`DEBUG mode is: ${DEBUG}`);
    if (DEBUG) console.log(`Is admin: ${isAdmin}, pfpAnyoneEnabled: ${pfpAnyoneEnabled}`);

    // Allow admins to use the command even when pfpAnyoneEnabled is false
    if (!isAdmin && !pfpAnyoneEnabled) {
        await logMessage(client, guild, 'The !pfp command is currently disabled for general users.');
        return;
    }

    // Expecting command format: !pfp <username>
    if (args.length === 2) {
        const username = args[1];
        const targetMember = guild.members.cache.find(m => m.user.username.toLowerCase() === username.toLowerCase());

        if (targetMember) {
            await generateProfilePicture(client, targetMember); // Generate the profile picture
        } else {
            await logMessage(client, guild, `User ${username} not found.`);
        }
    } else {
        await logMessage(client, guild, 'Usage: !pfp <username>');
    }
}

