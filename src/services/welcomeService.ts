import { Client, GuildMember, TextChannel } from 'discord.js';
import { generateProfilePicture } from './pfpService';
import { generateWelcomeImage, downloadAndSaveImage, describeImage } from '../utils/imageUtils';
import { WELCOME_CHANNEL_ID, WELCOME_PROMPT, POSTING_DELAY, BOTSPAM_CHANNEL_ID, STEALTH_WELCOME, getWILDCARD, DEBUG, GENDER_SENSITIVITY } from '../config';
import path from 'path';
import fs from 'fs';
import { logMessage } from '../utils/log';
import { readWelcomeCount, writeWelcomeCount } from '../utils/appUtils';

export let welcomeCount = readWelcomeCount();

// Notify admins in botspam channel
async function notifyAdmins(client: Client, guild: GuildMember['guild'], message: string, files: string[] = []): Promise<void> {
    const botspamChannel = guild.channels.cache.get(BOTSPAM_CHANNEL_ID) as TextChannel;
    if (botspamChannel?.isTextBased()) {
        await botspamChannel.send({
            content: message,
            files: files
        });
    }
}

// Post to user in welcome or profile channel with a delay
async function postToUser(client: Client, guild: GuildMember['guild'], userId: string, channelId: string, message: string, files: string[] = []): Promise<void> {
    const postDelayInMs = POSTING_DELAY * 1000;
    setTimeout(async () => {
        try {
            const targetChannel = guild.channels.cache.get(channelId) as TextChannel;
            if (targetChannel?.isTextBased()) {
                await targetChannel.send({
                    content: message,
                    files: files,
                    allowedMentions: STEALTH_WELCOME ? { users: [userId] } : undefined // Silent mention for only the new user
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (DEBUG) console.error('Error during delayed post to user:', errorMessage);
            await logMessage(client, guild, `Error during delayed post to user: ${errorMessage}`);
        }
    }, postDelayInMs);
}

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

        // Check if the user has a custom profile picture or is using a default Discord logo
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

            // Notify admins about profile picture generation
            await notifyAdmins(client, guild, `Profile picture generated for user "${displayName}".`, []);
            
            // Exit after generating profile picture, no welcome image is needed in this case
            return;
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

        // Notify admins about welcome image generation
        await notifyAdmins(client, guild, `Welcome image generated for user "${displayName}".`, avatarPath ? [avatarPath, welcomeImagePath] : [welcomeImagePath]);

        // Post welcome image to the welcome channel with a delay
        await postToUser(client, guild, userId, WELCOME_CHANNEL_ID, `Welcome, <@${userId}>!`, [welcomeImagePath]);

        // Increment welcome count and log it
        welcomeCount++;
        writeWelcomeCount(welcomeCount);
        await logMessage(client, guild, `Welcome count updated: ${welcomeCount}`);

        // Clean up temp files
        if (avatarPath) fs.unlinkSync(avatarPath);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('Error during welcome process:', errorMessage);
        await logMessage(client, guild, `Error during welcome process: ${errorMessage}`);
    }
}
