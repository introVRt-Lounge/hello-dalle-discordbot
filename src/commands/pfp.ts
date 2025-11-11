import { Client, CommandInteraction, PermissionsBitField, ChatInputCommandInteraction } from 'discord.js';
import { generateProfilePicture } from '../services/pfpService';
import { cooldownService } from '../services/cooldownService';
import { logMessage } from '../utils/log';
import { DEBUG, GENDER_SENSITIVITY, BOT_USER_ROLE, ImageEngine, getDEFAULT_ENGINE } from '../config';

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

    const userId = (member as any).user?.id;
    if (!userId) {
        await interaction.reply({ content: 'Error: Could not identify user.', ephemeral: true });
        return;
    }

    // Check cooldown/rate limiting
    const cooldownCheck = cooldownService.canMakePfpRequest(userId);
    if (!cooldownCheck.canProceed) {
        await interaction.reply({ content: cooldownCheck.message!, ephemeral: true });
        return;
    }

    const username = interaction.options.getString('username', true)?.toLowerCase();
    const overridePrompt = interaction.options.getString('override');
    const isPrivate = interaction.options.getBoolean('private') ?? false;
    const engine = (interaction.options.getString('engine') as ImageEngine) ?? getDEFAULT_ENGINE();
    const useExistingPfp = interaction.options.getBoolean('use-existing-pfp') ?? false;

    // Validate use-existing-pfp option
    if (useExistingPfp && engine !== 'gemini') {
        await interaction.reply({
            content: '❌ The `use-existing-pfp` option is only available with Gemini engine, which provides true image-to-image transformation. For DALL-E, avatar analysis is automatically included in welcome images but not available for profile picture generation.',
            ephemeral: true
        });
        return;
    }

    try {
        // First try to find member in cache for speed
        let targetMember = guild.members.cache.find(
            m => m.user.username.toLowerCase() === username || (m.displayName && m.displayName.toLowerCase() === username)
        );

        // If not found in cache, do a targeted fetch with timeout protection
        if (!targetMember) {
            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('MemberFetchTimeout')), 3000)
                );
                const fetchPromise = guild.members.fetch({ query: username, limit: 10 });
                const fetchedMembers = await Promise.race([fetchPromise, timeoutPromise]) as any;
                targetMember = fetchedMembers.find(
                    m => m.user.username.toLowerCase() === username || (m.displayName && m.displayName.toLowerCase() === username)
                );
            } catch (fetchError) {
                console.error('Error fetching member for pfp command:', fetchError);
                // Continue with targetMember = null, will show error below
            }
        }

        if (targetMember) {
            // Generate unique request ID for tracking
            const requestId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            let promptDescription = `using ${engine} engine with default prompt`;
            if (overridePrompt) {
                if (isPrivate) {
                    promptDescription = `using ${engine} engine with custom prompt (private)`;
                } else {
                    promptDescription = `using ${engine} engine with custom prompt: "${overridePrompt}"`;
                }
            }
            if (useExistingPfp && engine === 'gemini') {
                promptDescription += ' (using existing avatar)';
            }

            // Start tracking the request
            cooldownService.startPfpRequest(userId, requestId);

            await interaction.reply({ content: `Generating profile picture for ${username} ${promptDescription}...`, ephemeral: true });

            try {
                await generateProfilePicture(client, targetMember, GENDER_SENSITIVITY, overridePrompt || undefined, isPrivate, engine, useExistingPfp);
                // Complete the request tracking on success
                cooldownService.completePfpRequest(userId, requestId);
                await interaction.followUp({ content: `✅ Profile picture generated successfully for ${username} using ${engine}!`, ephemeral: true });
            } catch (genError) {
                // Complete the request tracking on error too
                cooldownService.completePfpRequest(userId, requestId);
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

