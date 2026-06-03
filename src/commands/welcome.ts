import { Client, ChatInputCommandInteraction, GuildMember, PermissionsBitField, TextChannel } from 'discord.js';
import { logMessage } from '../utils/log';
import { welcomeUser } from '../services/welcomeService';
import { BOT_USER_ROLE, BOTSPAM_CHANNEL_ID, ImageEngine, getDEFAULT_ENGINE } from '../config';
import { hasWelcomedUser } from '../utils/appUtils';

// Check if user has permission to use welcome command
function hasWelcomePermission(member: any): boolean {
    if (!member) return false;

    // Check if user is admin
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (isAdmin) return true;

    // Check if user has the specific role
    const hasRole = member.roles.cache.has(BOT_USER_ROLE);
    if (hasRole) return true;

    return false;
}

export async function welcomeSlashCommand(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild) {
        await interaction.reply({ content: 'Error: Guild not found.', ephemeral: true });
        return;
    }

    // Check permissions
    if (!hasWelcomePermission(member)) {
        await interaction.reply({ content: 'You do not have permission to use this command. You need admin privileges or the designated role.', ephemeral: true });
        return;
    }

    const username = interaction.options.getString('username', true);
    const destination = interaction.options.getString('destination', true);
    const engine = (interaction.options.getString('engine') as ImageEngine) ?? getDEFAULT_ENGINE();

    try {
        // Try finding the user in the cache (case-insensitive)
        let member = guild.members.cache.find(member => member.user.username.toLowerCase() === username.toLowerCase());

        if (!member) {
            try {
                // If not found in cache, fetch from Discord API
                const fetchedMembers = await guild.members.fetch({ query: username, limit: 1 });
                member = fetchedMembers.first(); // Now, this will return undefined if no match is found
            } catch (error) {
                console.error('Error fetching member:', error);
            }
        }

        if (member) {
            const destinationText = destination === 'welcome' ? 'welcome channel' : 'botspam channel (debug mode)';
            await interaction.reply({ content: `Triggering welcome for ${username} in ${destinationText} using ${engine}...`, ephemeral: true });
            await welcomeUser(client, member, destination === 'botspam', engine);
        } else {
            await interaction.reply({ content: `User ${username} not found.`, ephemeral: true });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await interaction.reply({ content: `Error processing welcome command: ${errorMessage}`, ephemeral: true });
    }
}

// Legacy function for backward compatibility (can be removed once all ! commands are converted)
export async function welcomeCommand(client: Client, message: any): Promise<void> {
    // This function is kept for backward compatibility during transition
    // Implementation would be similar to the slash command but using message instead of interaction
}

// Function to handle welcoming a new member (for the 'guildMemberAdd' event)
export async function welcomeNewMember(client: Client, member: GuildMember): Promise<void> {
    const guild = member.guild;
    const displayName = member.displayName;
    const userId = member.user.id;

    // Skip auto-welcome for rejoiners we have already welcomed once.
    // This is a hard short-circuit: no image generation, no welcome-channel post,
    // no welcome-count increment. Admins can still trigger /welcome manually.
    if (hasWelcomedUser(userId)) {
        const skipMessage = `Skipping welcome for "${displayName}" (id ${userId}) - already welcomed previously (rejoin detected).`;
        await logMessage(client, guild, skipMessage);
        try {
            const botspam = guild.channels.cache.get(BOTSPAM_CHANNEL_ID) as TextChannel | undefined;
            if (botspam?.isTextBased()) {
                await botspam.send(`👋 Welcome back, <@${userId}>! Skipping fresh welcome image - we've already welcomed this user before.`);
            }
        } catch (notifyError) {
            const errorMessage = notifyError instanceof Error ? notifyError.message : String(notifyError);
            await logMessage(client, guild, `Failed to notify botspam about rejoin skip for ${displayName}: ${errorMessage}`);
        }
        return;
    }

    // Log the new member's join
    await logMessage(client, guild, `New member joined: ${displayName}`);

    try {
        // Call the service function to handle the actual welcome process
        // Use the default engine for new member welcomes
        await welcomeUser(client, member, false, getDEFAULT_ENGINE());
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logMessage(client, guild, `Error welcoming new member ${displayName}: ${errorMessage}`);
    }
}
