import { Client, CommandInteraction, PermissionsBitField, ChatInputCommandInteraction } from 'discord.js';
import { generateProfilePicture } from '../services/pfpService';
import { logMessage } from '../utils/log';
import { DEBUG, GENDER_SENSITIVITY, BOT_USER_ROLE } from '../config';

// Check if user has permission to use pfp command
function hasPfpPermission(member: any, pfpAnyoneEnabled: boolean): boolean {
    if (!member) return false;

    // Check if user is admin
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (isAdmin) return true;

    // Check if user has the specific role
    const hasRole = member.roles.cache.has(BOT_USER_ROLE);
    if (hasRole) return true;

    // Check if pfp is enabled for everyone
    return pfpAnyoneEnabled;
}

export async function handlePfpSlashCommand(client: Client, interaction: ChatInputCommandInteraction, pfpAnyoneEnabled: boolean): Promise<void> {
    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild || !member) {
        await interaction.reply({ content: 'Error: Guild or member not found.', ephemeral: true });
        return;
    }

    // Check permissions
    if (!hasPfpPermission(member, pfpAnyoneEnabled)) {
        const replyContent = pfpAnyoneEnabled
            ? 'You do not have permission to use this command. You need admin privileges or the designated role.'
            : 'The pfp command is currently disabled for general users.';
        await interaction.reply({ content: replyContent, ephemeral: true });
        return;
    }

    const username = interaction.options.getString('username', true)?.toLowerCase();
    const overridePrompt = interaction.options.getString('override');

    try {
        // Fetch all members of the guild to ensure a complete search
        const members = await guild.members.fetch();
        const targetMember = members.find(
            m => m.user.username.toLowerCase() === username || m.displayName.toLowerCase() === username
        );

        if (targetMember) {
            const promptDescription = overridePrompt ? 'using custom prompt' : 'using default prompt';
            await interaction.reply({ content: `Generating profile picture for ${username} ${promptDescription}...`, ephemeral: true });

            try {
                await generateProfilePicture(client, targetMember, GENDER_SENSITIVITY, overridePrompt || undefined);
                await interaction.followUp({ content: `✅ Profile picture generated successfully for ${username}!`, ephemeral: true });
            } catch (genError) {
                const genErrorMessage = genError instanceof Error ? genError.message : String(genError);
                if (DEBUG) console.error('Error generating profile picture:', genErrorMessage);
                await interaction.followUp({
                    content: `❌ Failed to generate profile picture for ${username}: ${genErrorMessage}`,
                    ephemeral: true
                });
            }
        } else {
            await interaction.reply({ content: `User ${username} not found.`, ephemeral: true });
        }
    } catch (error) {
        if (DEBUG) console.error('Error fetching guild members:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        await interaction.reply({ content: `Error fetching guild members: ${errorMessage}`, ephemeral: true });
    }
}

// Legacy function for backward compatibility (can be removed once all ! commands are converted)
export async function handlePfpCommand(client: Client, message: any, pfpAnyoneEnabled: boolean): Promise<void> {
    // This function is kept for backward compatibility during transition
    // Implementation would be similar to the slash command but using message instead of interaction
}

