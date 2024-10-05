import { Client, GuildMember, TextChannel } from 'discord.js';
import { generateWelcomeImage, downloadAndSaveImage, describeImage } from '../utils/imageUtils';
import { WELCOME_CHANNEL_NAME, WELCOME_PROMPT, POSTING_DELAY, BOTSPAM_CHANNEL_ID, getWILDCARD, DEBUG } from '../config';
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

        // Download the avatar image
        const avatarPath = path.join(__dirname, '../../temp', `downloaded_avatar_${Date.now()}.png`);
        if (DEBUG) console.log(`DEBUG: Submitting avatar for description: ${avatarUrl}`);
        await downloadAndSaveImage(avatarUrl, avatarPath);

        // Describe the avatar image
        const avatarDescription = await describeImage(avatarPath, avatarUrl);
        if (DEBUG) console.log(`DEBUG: Submitted avatar for description, result: ${avatarDescription}`);

        // Generate prompt with the avatar description
        const randomNumber = Math.random() * 100;
        const prompt = randomNumber < getWILDCARD()
            ? `Generate a welcome image for the user "${displayName}", inspired by their name. Add the text "Welcome ${displayName}" to the image.`
            : WELCOME_PROMPT.replace('{username}', displayName).replace('{avatar}', avatarDescription);

        await logMessage(client, guild, `Generated prompt: ${prompt}`);

        // Generate the welcome image with watermark
        const welcomeImagePath = await generateWelcomeImage(prompt);
        if (DEBUG) console.log(`DEBUG: Generated and watermarked image path: ${welcomeImagePath}`);

        // **Send both avatar and welcome images to the botspam channel using BOTSPAM_CHANNEL_ID**
        const botspamChannel = guild.channels.cache.get(BOTSPAM_CHANNEL_ID) as TextChannel;
        // Define POSTING_DELAY in milliseconds
        const postDelayInMs = POSTING_DELAY * 1000;

        if (botspamChannel?.isTextBased()) {
            await botspamChannel.send({
                content: `Welcome, <@${userId}>! Here is the original profile pic and welcome image generated:`,
                files: [avatarPath, welcomeImagePath]
            });

            const delayTimestamp = Math.floor((Date.now() + postDelayInMs) / 1000);  // Convert to Unix timestamp in seconds
            await botspamChannel.send(`The welcome image will be posted in #${WELCOME_CHANNEL_NAME} <t:${delayTimestamp}:R>.`);
        }

        // Delay for POSTING_DELAY seconds before sending to new-users
        setTimeout(async () => {
            const welcomeChannel = guild.channels.cache.find(channel => channel.name === WELCOME_CHANNEL_NAME) as TextChannel;
            if (welcomeChannel?.isTextBased()) {
                await welcomeChannel.send({
                    content: `Welcome, <@${userId}>!`,
                    files: [welcomeImagePath]
                });
            }

            // Increment welcome count and log it
            welcomeCount++;
            writeWelcomeCount(welcomeCount);
            await logMessage(client, guild, `Welcome count updated: ${welcomeCount}`);

            // Clean up temp files
            fs.unlinkSync(avatarPath);
            //fs.unlinkSync(welcomeImagePath);
        }, postDelayInMs);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('Error during welcome process:', errorMessage);
        await logMessage(client, guild, `Error during welcome process: ${errorMessage}`);
    }
}
