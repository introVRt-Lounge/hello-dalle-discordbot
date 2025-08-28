import { Client, REST } from 'discord.js';
import { Routes } from 'discord-api-types/v9';
import { config } from 'dotenv';

config();

const commands = [
  {
    name: 'pfp',
    description: 'Generate a profile picture suggestion for a user',
    options: [
      {
        name: 'username',
        description: 'The username of the user to generate a profile picture for',
        type: 3, // STRING
        required: true,
        autocomplete: true,
      },
      {
        name: 'override',
        description: 'Custom prompt to use instead of the default (optional)',
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: 'pfp-anyone',
    description: 'Toggle whether regular users can use the pfp command (Admin only)',
    type: 1, // CHAT_INPUT
  },
  {
    name: 'welcome',
    description: 'Manually trigger a welcome message for a specific user',
    options: [
      {
        name: 'username',
        description: 'The username of the user to welcome',
        type: 3, // STRING
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: 'wildcard',
    description: 'Set the wildcard chance for welcome image generation (0-99)',
    options: [
      {
        name: 'value',
        description: 'The wildcard percentage (0-99)',
        type: 4, // INTEGER
        required: true,
      },
    ],
  },
];

export async function registerSlashCommands(client: Client): Promise<void> {
  if (!client.user || !process.env.DISCORD_BOT_TOKEN) {
    console.error('Bot user or token not available for slash command registration');
    return;
  }

  const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}
