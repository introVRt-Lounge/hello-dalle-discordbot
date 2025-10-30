import { Client, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { getWILDCARD, setWILDCARD } from '../config';
import { logMessage } from '../utils/log';
import { BOT_USER_ROLE } from '../config';

// Check if user has permission to use wildcard command
function hasWildcardPermission(member: any): boolean {
    if (!member) return false;

    // Check if user is admin
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (isAdmin) return true;

    // Check if user has the specific role
    const hasRole = member.roles.cache.has(BOT_USER_ROLE);
    if (hasRole) return true;

    return false;
}

// Handle the wildcard slash command
export async function handleWildcardSlashCommand(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild) {
        await interaction.reply({ content: 'Error: Guild not found.', ephemeral: true });
        return;
    }

    // Check permissions
    if (!hasWildcardPermission(member)) {
        await interaction.reply({ content: 'You do not have permission to use this command. You need admin privileges or the designated role.', ephemeral: true });
        return;
    }

    const value = interaction.options.getInteger('value', true);

    // Validate the input
    if (value >= 0 && value <= 99) {
        setWILDCARD(value); // Set the new wildcard value
        await interaction.reply({ content: `Wildcard chance set to ${value}%`, ephemeral: true });

        // Also log to the botspam channel
        await logMessage(client, guild, `/wildcard command: Wildcard chance set to ${value}%`);
    } else {
        await interaction.reply({ content: 'Wildcard value must be between 0 and 99.', ephemeral: true });
    }
}

// Legacy function for backward compatibility (can be removed once all ! commands are converted)
export async function handleWildcardCommand(client: Client, message: any): Promise<void> {
    // This function is kept for backward compatibility during transition
    // Implementation would be similar to the slash command but using message instead of interaction
}
