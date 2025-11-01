import { Client, GuildMember, TextChannel } from 'discord.js';
import { generateProfilePicture } from './pfpService';
import { generateWelcomeImage, downloadAndSaveImage, describeImage } from '../utils/imageUtils';
import { ImageEngine, getDEFAULT_ENGINE } from '../config';
import { WELCOME_CHANNEL_ID, WELCOME_PROMPT, POSTING_DELAY, BOTSPAM_CHANNEL_ID, STEALTH_WELCOME, getWILDCARD, DEBUG, GENDER_SENSITIVITY } from '../config';
import { analyzeImageContent } from './geminiService';
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

export async function welcomeUser(client: Client, member: GuildMember, debugMode: boolean = false, engine: ImageEngine = getDEFAULT_ENGINE()): Promise<void> {
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
            ? `Create a humorous welcome image for "${displayName}" that playfully ribs them about their ${avatarDescription || 'unique style'}. Make it light-hearted and fun, not mean-spirited. Include the text "Welcome ${displayName}" prominently in a cyberpunk style billboard. The overall aesthetic should be synthwave/cyberpunk with their avatar characteristics incorporated in a creative, joking way.`
            : WELCOME_PROMPT.replace('{username}', displayName).replace('{avatar}', avatarDescription || 'an avatar');

        await logMessage(client, guild, `Generated prompt: ${prompt}`);

        // Generate the welcome image with watermark
        // For Gemini, use double-LLM strategy: analyze avatar then generate with enhanced prompt
        let imageInput: string | undefined;
        let finalPrompt = prompt;

        if (engine === 'gemini' && avatarPath) {
            // Use the actual avatar image for image-to-image generation
            imageInput = avatarPath;

            try {
                // Step 1: Analyze the avatar image using Gemini 2.0 Flash
                if (DEBUG) console.log(`DEBUG: Analyzing avatar for double-LLM welcome generation: ${avatarPath}`);
                const analysisResult = await analyzeImageContent(avatarPath);
                if (DEBUG) console.log(`DEBUG: Avatar analysis result: ${analysisResult}`);

                // Step 2: Construct enhanced prompt using analysis
                finalPrompt = `Using the input image as reference: ${analysisResult}. Create a welcome image for ${displayName} proclaimed upon and incorporated into a cyberpunk billboard in a mixture of synthwave and cyberpunk styles.`;

                if (DEBUG) console.log(`DEBUG: Enhanced Gemini welcome prompt: ${finalPrompt}`);
            } catch (analysisError) {
                // Fallback to simpler approach if analysis fails
                if (DEBUG) console.error('DEBUG: Avatar analysis failed, using fallback prompt:', analysisError);
                finalPrompt = `Create a welcome image featuring this user's avatar. ${prompt.replace('{avatar}', 'the provided avatar image')}`;
            }

            if (DEBUG) console.log(`DEBUG: Using avatar image for image-to-image welcome generation: ${avatarPath}`);
        }

        const welcomeImagePath = await generateWelcomeImage(finalPrompt, engine, { imageInput });
        if (DEBUG) console.log(`DEBUG: Generated and watermarked image path: ${welcomeImagePath}`);

        // Notify admins about welcome image generation
        await notifyAdmins(client, guild, `Welcome image generated for user "${displayName}".`, avatarPath ? [avatarPath, welcomeImagePath] : [welcomeImagePath]);

        // Post welcome image to the appropriate channel based on debug mode
        const targetChannelId = debugMode ? BOTSPAM_CHANNEL_ID : WELCOME_CHANNEL_ID;
        const welcomeMessage = debugMode ? `DEBUG WELCOME: Welcome, <@${userId}>!` : `Welcome, <@${userId}>!`;
        await postToUser(client, guild, userId, targetChannelId, welcomeMessage, [welcomeImagePath]);

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
