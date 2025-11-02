import { Client, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { getDEFAULT_ENGINE, setDEFAULT_ENGINE, ImageEngine, BOT_USER_ROLE } from '../config';

// Check if user has permission to use engine command
function hasEnginePermission(member: any): boolean {
    if (!member) return false;

    // Check if user is admin
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (isAdmin) return true;

    // Check if user has the specific role
    const hasRole = member.roles.cache.has(BOT_USER_ROLE);
    if (hasRole) return true;

    return false;
}

// Handle the engine slash command
export async function handleEngineSlashCommand(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild) {
        await interaction.reply({ content: 'Error: Guild not found.', ephemeral: true });
        return;
    }

    // Check permissions
    if (!hasEnginePermission(member)) {
        await interaction.reply({ content: 'You do not have permission to use this command. You need admin privileges or the designated role.', ephemeral: true });
        return;
    }

    const engine = interaction.options.getString('engine', true) as ImageEngine;

    // Validate the input
    if (engine === 'dalle' || engine === 'gemini') {
        setDEFAULT_ENGINE(engine); // Set the new default engine
        await interaction.reply({ content: `Default image generation engine set to ${engine.toUpperCase()}`, ephemeral: true });
    } else {
        await interaction.reply({ content: 'Engine must be either "dalle" or "gemini".', ephemeral: true });
    }
}

// Legacy function for backward compatibility (can be removed once all ! commands are converted)
export async function handleEngineCommand(client: Client, message: any): Promise<void> {
    // This function is kept for backward compatibility during transition
    // Implementation would be similar to the slash command but using message instead of interaction
}
