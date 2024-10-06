import { Client, GuildMember, TextChannel } from 'discord.js';
import { DEBUG, PROFILE_CHANNEL_ID, STEALTH_WELCOME } from '../config';
import { logMessage } from '../utils/log';
import { generateImage, downloadAndSaveImage } from '../utils/imageUtils'; // Utilities for generating and saving images
import path from 'path';
import fs from 'fs';
console.log(`DEBUG mode is: ${DEBUG}`);

// Define base path for saving images
const basePath = path.join(__dirname, '..', '..', 'welcome_images');

// Ensure the welcome_images directory exists
if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath);
}

// Function to generate profile picture based on username
export async function generateProfilePicture(client: Client, member: GuildMember): Promise<void> {
    const guild = member.guild;
    const displayName = member.displayName;

    try {
        // Generate a profile picture based on the username
        const fullPrompt = `To the best of your ability, create a discord profile picture for the user "${displayName}" inspired by their name. Image only, no text. Circular to ease cropping.`;

        await logMessage(client, guild, `Generating profile picture for user "${displayName}" based on their username.`);

        const imageUrl = await generateImage(fullPrompt);
        if (DEBUG) console.log(`DEBUG: Generated profile picture URL for ${displayName}: ${imageUrl}`);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // Use basePath for saving profile pictures and welcome images
        const profilePicPath = path.join(basePath, `${displayName}-profile-${timestamp}.png`);

        // Download the image
        await downloadAndSaveImage(imageUrl, profilePicPath);

        // Debugging the generated image path
        if (DEBUG) console.log(`Profile picture generated and saved to path: ${profilePicPath}`);

        // Debugging before sending PFP
        if (DEBUG) console.log(`Attempting to send profile picture for user: ${displayName} to Discord.`);

        // Post to profile channel for users without a profile pic
        await postToProfileChannel(client, member, profilePicPath);

        if (DEBUG) console.log(`Profile picture sent for user: ${displayName}`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('Error during profile picture generation:', errorMessage);
        await logMessage(client, guild, `Error generating profile picture: ${errorMessage}`);
    }
}

// Send a profile pic for a new user without one
async function postToProfileChannel(client: Client, member: GuildMember, profilePicPath: string): Promise<void> {
    const profileChannel = member.guild.channels.cache.get(PROFILE_CHANNEL_ID) as TextChannel;
    if (profileChannel?.isTextBased()) {
        if (DEBUG) console.log(`Sending profile picture to profile channel for user: ${member.user.username}`);

        await profileChannel.send({
            content: `Hey <@${member.user.id}>, you don't have a profile pic yet - do you want to use this one we made for you, based on your username?`,
            files: [profilePicPath],
            allowedMentions: STEALTH_WELCOME ? { users: [member.user.id] } : undefined // Stealth notification for profile picture suggestion
        });
    } else {
        if (DEBUG) console.warn(`Profile channel with ID ${PROFILE_CHANNEL_ID} not found or is not a text channel.`);
    }
}
