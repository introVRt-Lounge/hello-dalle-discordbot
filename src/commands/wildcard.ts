import { Client, CommandInteraction } from 'discord.js';
import { getWILDCARD, setWILDCARD } from '../config';
import { logMessage } from '../utils/log';

// Handle the wildcard slash command
export async function handleWildcardSlashCommand(client: Client, interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ content: 'Error: Guild not found.', ephemeral: true });
        return;
    }

    const value = interaction.options.get('value')?.value as number;

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
