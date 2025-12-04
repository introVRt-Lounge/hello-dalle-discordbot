import { Client, GuildMember, TextChannel } from 'discord.js';
import { generateProfilePicture } from './pfpService';
import { generateWelcomeImage, downloadAndSaveImage, describeImage } from '../utils/imageUtils';
import { ImageEngine, getDEFAULT_ENGINE } from '../config';
import { WELCOME_CHANNEL_ID, WELCOME_PROMPT, POSTING_DELAY, BOTSPAM_CHANNEL_ID, STEALTH_WELCOME, getWILDCARD, DEBUG, GENDER_SENSITIVITY } from '../config';
import { analyzeImageContent } from './geminiService';
import * as path from 'path';
import * as fs from 'fs';
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

    // 🎉 MILESTONE CHECK: Has the server just reached 500 human members?
    // Count only human members (exclude bots) for the milestone celebration
    // guild.members.cache.filter(member => !member.user.bot).size gives us human member count
    const humanMemberCount = guild.members.cache.filter(member => !member.user.bot).size;
    const isMilestoneWelcome = humanMemberCount === 500;

    try {
        // Log the avatar URL
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png' });
        if (DEBUG) console.log(`DEBUG: Avatar URL: ${avatarUrl}`);

        let avatarPath = '';
        let avatarDescription = '';

        // Check if the user has a custom profile picture or is using a default Discord logo
        // Parse URL to safely check hostname instead of using includes() which can be bypassed
        let isDefaultAvatar = false;
        try {
            const urlObj = new URL(avatarUrl);
            isDefaultAvatar = urlObj.hostname === 'discord.com' && urlObj.pathname.startsWith('/assets/') ||
                             urlObj.hostname === 'cdn.discordapp.com' && urlObj.pathname.includes('/embed/avatars/');
        } catch (error) {
            // If URL parsing fails, assume it's custom to be safe
            isDefaultAvatar = false;
        }

        if (avatarUrl && !isDefaultAvatar) {
            // User has a custom profile picture, download and describe it
            avatarPath = path.join(__dirname, '../../temp', `downloaded_avatar_${Date.now()}.png`);
            await downloadAndSaveImage(avatarUrl, avatarPath);
            if (DEBUG) console.log(`DEBUG: Downloaded avatar image to: ${avatarPath}`);

            // Describe the avatar image
            if (DEBUG) console.log(`DEBUG: Describing avatar.`);
            avatarDescription = await describeImage(avatarPath, avatarUrl, GENDER_SENSITIVITY);
            if (DEBUG) console.log(`DEBUG: Avatar description: ${avatarDescription}`);
        } else {
            // No custom profile picture available
            if (isMilestoneWelcome) {
                // For milestones, we still want to create a welcome image even without avatar
                // Just create a generic avatar description for text-to-image generation
                avatarDescription = `a friendly Discord user named ${displayName}`;
                if (DEBUG) console.log(`DEBUG: No custom avatar for milestone user "${displayName}". Using generic description: ${avatarDescription}`);
            } else {
                // For regular welcomes without avatar, generate a profile picture instead
                if (DEBUG) console.log(`DEBUG: No custom profile picture found for user "${displayName}". Generating profile picture.`);
                await generateProfilePicture(client, member, GENDER_SENSITIVITY);

                // Notify admins about profile picture generation
                await notifyAdmins(client, guild, `Profile picture generated for user "${displayName}".`, []);

                // Exit after generating profile picture, no welcome image is needed in this case
                return;
            }
        }

        // 🎉 MILESTONE WELCOME: Special golden VIP treatment for user #463 (500th member)
        let finalPrompt: string;
        let milestoneMessage = '';

        if (isMilestoneWelcome) {
            // Force Gemini engine for maximum personalization and quality
            engine = 'gemini';

            if (avatarPath) {
                // User has avatar - use image-to-image transformation
                finalPrompt = `Create an absolutely spectacular golden VIP welcome image for "${displayName}" - our 500th Discord member! 🎉🏆

Using the input image as reference: **${avatarDescription}**

Transform this into a luxurious golden celebration featuring:
- Opulent gold accents and metallic finishes throughout
- Royal VIP elements (crowns, jewels, luxury branding, golden scepters)
- Display the EXACT TEXT "500th Member" prominently in large, elegant golden letters
- Towering golden obelisks and phallic monuments rising majestically
- Rocket-shaped fireworks launching skyward with golden trails
- Crown jewels and royal staffs with commanding presence
- Cyberpunk/synthwave aesthetic with golden holographic effects
- The user's avatar transformed into a VIP version with golden enhancements and commanding stature

Make this the most spectacular welcome image ever created - fit for royalty! ✨👑 The composition should emphasize height, power, and celebration with multiple towering elements.`;
            } else {
                // No avatar - use text-to-image generation
                finalPrompt = `Create an absolutely spectacular golden VIP welcome image for "${displayName}" - our 500th Discord member! 🎉🏆

Design a majestic golden celebration scene featuring:
- Opulent gold accents and metallic finishes throughout
- Royal VIP elements (crowns, jewels, luxury branding, golden scepters)
- Display the EXACT TEXT "500th Member" prominently in large, elegant golden letters
- Towering golden obelisks and phallic monuments rising majestically
- Rocket-shaped fireworks launching skyward with golden trails
- Crown jewels and royal staffs with commanding presence
- Cyberpunk/synthwave aesthetic with golden holographic effects
- A regal figure representing "${displayName}" in golden royal attire

Make this the most spectacular welcome image ever created - fit for royalty! ✨👑 The composition should emphasize height, power, and celebration with multiple towering elements.`;
            }

            milestoneMessage = `🎉 **INCREDIBLE MILESTONE ALERT!** 🎉\n\nWelcome our **500th Discord member**, <@${userId}>! 🏆✨\n\nThis calls for something EXTRA SPECIAL - a golden VIP welcome created just for you with our premium Gemini engine! 🌟`;

            await logMessage(client, guild, `🎉 MILESTONE WELCOME: Creating golden VIP welcome for 500th member "${displayName}" using Gemini!`);
        } else {
            // Generate prompt with the avatar description if applicable (normal welcome)
            const randomNumber = Math.random() * 100;
            finalPrompt = randomNumber < getWILDCARD()
                ? `Create a humorous welcome image for "${displayName}" that playfully ribs them about their ${avatarDescription || 'unique style'}. Make it light-hearted and fun, not mean-spirited. Include the text "Welcome ${displayName}" prominently in a cyberpunk style billboard. The overall aesthetic should be synthwave/cyberpunk with their avatar characteristics incorporated in a creative, joking way.`
                : WELCOME_PROMPT.replace('{username}', displayName).replace('{avatar}', avatarDescription || 'an avatar');

            await logMessage(client, guild, `Generated prompt: ${finalPrompt}`);
        }

        // Generate the welcome image with watermark
        let imageInput: string | undefined;

        if (engine === 'gemini' && avatarPath) {
            // Use the actual avatar image for image-to-image generation (VIP treatment for milestones)
            imageInput = avatarPath;

            if (!isMilestoneWelcome) {
                // Normal Gemini welcome - use double-LLM strategy
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
                    finalPrompt = `Create a welcome image featuring this user's avatar. ${WELCOME_PROMPT.replace('{username}', displayName).replace('{avatar}', 'the provided avatar image')}`;
                }
            }
            // For milestone welcomes, finalPrompt is already set above with the golden VIP prompt

            if (DEBUG) console.log(`DEBUG: Using avatar image for ${isMilestoneWelcome ? 'VIP milestone' : 'image-to-image'} welcome generation: ${avatarPath}`);
        }

        const welcomeImagePath = await generateWelcomeImage(finalPrompt, engine, { imageInput });
        if (DEBUG) console.log(`DEBUG: Generated and watermarked image path: ${welcomeImagePath}`);

        // Notify admins about welcome image generation (with milestone celebration!)
        const adminMessage = isMilestoneWelcome
            ? `🎉 **MILESTONE WELCOME GENERATED!** 🎉\n\nGolden VIP welcome image created for our **500th Discord member** "${displayName}" using Gemini engine! ✨🏆\n\nThis is welcome #500 - what a spectacular achievement!`
            : `Welcome image generated for user "${displayName}".`;

        await notifyAdmins(client, guild, adminMessage, avatarPath ? [avatarPath, welcomeImagePath] : [welcomeImagePath]);

        // Post welcome image to the appropriate channel based on debug mode
        const targetChannelId = debugMode ? BOTSPAM_CHANNEL_ID : WELCOME_CHANNEL_ID;
        const welcomeMessage = debugMode
            ? `DEBUG WELCOME: ${milestoneMessage || `Welcome, <@${userId}>!`}`
            : `${milestoneMessage || `Welcome, <@${userId}>!`}`;

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