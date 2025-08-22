import { Client, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { logMessage } from '../utils/log';
import { welcomeUser } from '../services/welcomeService';

export async function welcomeSlashCommand(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ content: 'Error: Guild not found.', ephemeral: true });
        return;
    }

    const username = interaction.options.getString('username', true);

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
            await interaction.reply({ content: `Triggering welcome for ${username}...`, ephemeral: true });
            await welcomeUser(client, member);
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

    // Log the new member's join
    await logMessage(client, guild, `New member joined: ${displayName}`);
    
    try {
        // Call the service function to handle the actual welcome process
        await welcomeUser(client, member);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logMessage(client, guild, `Error welcoming new member ${displayName}: ${errorMessage}`);
    }
}
