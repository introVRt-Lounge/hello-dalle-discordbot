import { Client, GuildMember, TextChannel } from 'discord.js';
import { generateProfilePicture } from './pfpService';
import { generateWelcomeImage, downloadAndSaveImage, describeImage } from '../utils/imageUtils';
import { WELCOME_CHANNEL_ID, WELCOME_PROMPT, POSTING_DELAY, BOTSPAM_CHANNEL_ID, STEALTH_WELCOME, getWILDCARD, DEBUG, GENDER_SENSITIVITY } from '../config';
import path from 'path';
import fs from 'fs';
import { logMessage } from '../utils/log';
import { readWelcomeCount, writeWelcomeCount } from '../utils/appUtils';

export let welcomeCount = readWelcomeCount();

// Function to handle welcoming a new user
export async function welcomeUser(client: Client, member: GuildMember): Promise<void> {
    const guild = member.guild;
    const displayName = member.displayName;
    const userId = member.user.id;

    try {
        // Log the avatar URL
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png' });
        if (DEBUG) console.log(`DEBUG: Avatar URL: ${avatarUrl}`);

        let avatarPath = '';
        let avatarDescription = '';

        // Check if the user has a profile picture or is using a default Discord logo
        if (avatarUrl && !avatarUrl.includes('https://discord.com/assets/') && !avatarUrl.includes('https://cdn.discordapp.com/embed/avatars/')) {
            // User has a custom profile picture, download and describe it
            avatarPath = path.join(__dirname, '../../temp', `downloaded_avatar_${Date.now()}.png`);
            await downloadAndSaveImage(avatarUrl, avatarPath);
            if (DEBUG) console.log(`DEBUG: Downloaded avatar image to: ${avatarPath}`);

            // Describe the avatar image
            if (DEBUG) console.log(`DEBUG: Describing avatar.`);
            avatarDescription = await describeImage(avatarPath, avatarUrl, GENDER_SENSITIVITY);
            if (DEBUG) console.log(`DEBUG: Avatar description: ${avatarDescription}`);
        } else {
            // No custom profile picture available, generate one
            if (DEBUG) console.log(`DEBUG: No custom profile picture found for user "${displayName}". Generating profile picture.`);
            await generateProfilePicture(client, member, GENDER_SENSITIVITY);
            return;  // Exit after generating profile picture, no welcome image is needed in this case
        }


        // Generate prompt with the avatar description if applicable
        const randomNumber = Math.random() * 100;
        const prompt = randomNumber < getWILDCARD()
            ? `Generate a welcome image for the user "${displayName}", inspired by their name. Add the text "Welcome ${displayName}" to the image.`
            : WELCOME_PROMPT.replace('{username}', displayName).replace('{avatar}', avatarDescription || 'an avatar');

        await logMessage(client, guild, `Generated prompt: ${prompt}`);

        // Generate the welcome image with watermark
        const welcomeImagePath = await generateWelcomeImage(prompt);
        if (DEBUG) console.log(`DEBUG: Generated and watermarked image path: ${welcomeImagePath}`);

        // Send both avatar and welcome images to the botspam channel using BOTSPAM_CHANNEL_ID
        const botspamChannel = guild.channels.cache.get(BOTSPAM_CHANNEL_ID) as TextChannel;
        const postDelayInMs = POSTING_DELAY * 1000;

        if (botspamChannel?.isTextBased()) {
            await botspamChannel.send({
                content: `Welcome, <@${userId}>! Here is the original profile pic and welcome image generated:`,
                files: [avatarPath, welcomeImagePath]
            });

            // Always notify admins about the upcoming post in the welcome channel
            const delayTimestamp = Math.floor((Date.now() + postDelayInMs) / 1000);  // Convert to Unix timestamp in seconds
            await botspamChannel.send(`The welcome image will be posted in <#${WELCOME_CHANNEL_ID}> <t:${delayTimestamp}:R>.`);
        }

        // Delay for POSTING_DELAY seconds before sending to welcome channel
        setTimeout(async () => {
            try {
                const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID) as TextChannel;
                if (welcomeChannel?.isTextBased()) {
                    await welcomeChannel.send({
                        content: `Welcome, <@${userId}>!`,
                        files: [welcomeImagePath],
                        allowedMentions: { users: [userId] } // Silent mention for only the new user
                    });
                }

                // Increment welcome count and log it
                welcomeCount++;
                writeWelcomeCount(welcomeCount);
                await logMessage(client, guild, `Welcome count updated: ${welcomeCount}`);

                // Clean up temp files
                fs.unlinkSync(avatarPath);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (DEBUG) console.error('Error during delayed welcome process:', errorMessage);
                await logMessage(client, guild, `Error during delayed welcome process: ${errorMessage}`);
            }
        }, postDelayInMs);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('Error during welcome process:', errorMessage);
        await logMessage(client, guild, `Error during welcome process: ${errorMessage}`);
    }
}
