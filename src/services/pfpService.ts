import { Client, GuildMember, TextChannel } from 'discord.js';
import { DEBUG, WELCOME_CHANNEL_ID, STEALTH_WELCOME, BOTSPAM_CHANNEL_ID } from '../config';
import { logMessage } from '../utils/log';
import { generateImage, downloadAndSaveImage } from '../utils/imageUtils'; // Utilities for generating and saving images
import path from 'path';
import fs from 'fs';

// Ensure the welcome_images directory exists
const basePath = path.join(__dirname, '..', '..', 'welcome_images');
if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath);
}

// Function to generate profile picture based on username
export async function generateProfilePicture(
    client: Client,
    member: GuildMember,
    genderSensitive: boolean = false
): Promise<void> {
    const guild = member.guild;
    const displayName = member.displayName;
    const userId = member.user.id;
    const accountCreationDate = member.user.createdAt;
    const accountAgeInYears = ((Date.now() - accountCreationDate.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);

    try {
        // Generate a profile picture based on the username
        const fullPrompt = `To the best of your ability, create a discord profile picture for the user "${displayName}" inspired by their name. Image only, no text. Circular to ease cropping.`;
        
        // Log to botspam about starting the process
        await logMessage(client, guild, `Generating profile picture for "${displayName}" - user account is ${accountAgeInYears} years old.`);

        const imageUrl = await generateImage(fullPrompt);
        if (DEBUG) console.log(`DEBUG: Generated profile picture URL for ${displayName}: ${imageUrl}`);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const profilePicPath = path.join(basePath, `${displayName}-profile-${timestamp}.png`);

        // Download the image
        await downloadAndSaveImage(imageUrl, profilePicPath);

        if (DEBUG) console.log(`Profile picture generated and saved to path: ${profilePicPath}`);

        // Log the generated image to botspam
        const botspamChannel = guild.channels.cache.get(BOTSPAM_CHANNEL_ID) as TextChannel;
        if (botspamChannel?.isTextBased()) {
            await botspamChannel.send({
                content: `Profile picture generated for "${displayName}":`,
                files: [profilePicPath]
            });
        }

        // Post to welcome channel for users without a profile pic
        await postToProfileChannel(client, member, profilePicPath);

        if (DEBUG) console.log(`Profile picture sent for user: ${displayName}`);

    } catch (error) {
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const errResponse = (error as any).response;
            console.error('Response data:', errResponse.data);
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('Error during profile picture generation:', errorMessage);
        await logMessage(client, guild, `Error generating profile picture: ${errorMessage}`);
    }
}

// Send a profile pic for a new user without one
async function postToProfileChannel(client: Client, member: GuildMember, profilePicPath: string): Promise<void> {
    const profileChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID) as TextChannel;
    if (profileChannel?.isTextBased()) {
        if (DEBUG) console.log(`Sending profile picture to welcome channel for user: ${member.user.username}`);

        await profileChannel.send({
            content: `Hey <@${member.user.id}>, you don't have a profile pic yet - do you want to use this one we made for you, based on your username?`,
            files: [profilePicPath],
            allowedMentions: STEALTH_WELCOME ? { users: [member.user.id] } : undefined // Stealth notification for profile picture suggestion
        });
    } else {
        if (DEBUG) console.warn(`Welcome channel with ID ${WELCOME_CHANNEL_ID} not found or is not a text channel.`);
    }
}