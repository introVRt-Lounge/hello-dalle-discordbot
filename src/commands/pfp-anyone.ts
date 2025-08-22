import { Client, CommandInteraction, PermissionsBitField } from 'discord.js';
import { logMessage } from '../utils/log';

let pfpAnyoneEnabled = false; // Move the flag here

export async function pfpAnyoneSlashCommand(client: Client, interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild || !member) {
        await interaction.reply({ content: 'Error: Guild or member not found.', ephemeral: true });
        return;
    }

    // Check if user is admin (only admins can toggle this)
    const isAdmin = (member as any).permissions?.has(PermissionsBitField.Flags.Administrator);
    if (!isAdmin) {
        await interaction.reply({ content: 'You need administrator privileges to use this command.', ephemeral: true });
        return;
    }

    // Toggle the pfp-anyone flag
    pfpAnyoneEnabled = !pfpAnyoneEnabled;
    await interaction.reply({ content: `Pfp command for everyone is now ${pfpAnyoneEnabled ? 'enabled' : 'disabled'}.`, ephemeral: true });

    // Also log to the botspam channel
    await logMessage(client, guild, `/pfp-anyone command: Pfp command for everyone is now ${pfpAnyoneEnabled ? 'enabled' : 'disabled'}.`);
}

// Legacy function for backward compatibility (can be removed once all ! commands are converted)
export async function pfpAnyoneCommand(client: Client, message: any): Promise<void> {
    // This function is kept for backward compatibility during transition
    // Implementation would be similar to the slash command but using message instead of interaction
}

// Add this helper function to get the current state of pfp-anyone
export function isPfpAnyoneEnabled(): boolean {
    return pfpAnyoneEnabled;
}
