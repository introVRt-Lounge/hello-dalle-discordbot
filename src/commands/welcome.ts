import { Client, Message, GuildMember } from 'discord.js';
import { logMessage } from '../utils/log';
import { welcomeUser } from '../services/welcomeService';

export async function welcomeCommand(client: Client, message: Message): Promise<void> {
    const guild = message.guild;
    const content = message.content;

    if (!guild) return;

    const args = content.split(' ');
    if (args.length === 2) {
        const username = args[1];

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
            await welcomeUser(client, member);
        } else {
            await logMessage(client, guild, `User ${username} not found.`);
        }
    } else {
        await logMessage(client, guild, 'Usage: !welcome <username>');
    }
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
