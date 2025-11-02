import { Client, GuildMember, TextChannel } from 'discord.js';
import { DEBUG, WELCOME_CHANNEL_ID, STEALTH_WELCOME, BOTSPAM_CHANNEL_ID } from '../config';
import { logMessage } from '../utils/log';
import { generateImage, downloadAndSaveImage, describeImage } from '../utils/imageUtils'; // Utilities for generating and saving images
import { ImageEngine, getDEFAULT_ENGINE } from '../config';
import { calculateImageHash, getCachedImageDescription, setCachedImageDescription } from '../utils/appUtils';
import path from 'path';
import fs from 'fs';

// Use the mounted welcome_images directory (from docker volume)
// In container: /usr/src/app/welcome_images (mounted from docker volume)
// In development: fallback to relative path
const basePath = process.env.NODE_ENV === 'production'
    ? '/usr/src/app/welcome_images'
    : path.join(__dirname, '..', '..', 'welcome_images');

if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
}

// Function to generate profile picture based on username
export async function generateProfilePicture(
    client: Client,
    member: GuildMember,
    genderSensitive: boolean = false,
    overridePrompt?: string,
    isPrivate: boolean = false,
    engine: ImageEngine = getDEFAULT_ENGINE(),
    useExistingPfp: boolean = false
): Promise<void> {
    const guild = member.guild;
    const displayName = member.displayName;
    const userId = member.user.id;
    const accountCreationDate = member.user.createdAt;
    const accountAgeInYears = ((Date.now() - accountCreationDate.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);

    let imageInput: string | undefined;

    try {
        // Generate a profile picture based on the username or custom override prompt
        let promptBase = `To the best of your ability, create a discord profile picture for the user "${displayName}"`;
        if (overridePrompt) {
            promptBase += ` based on this description: ${overridePrompt}`;
        } else {
            promptBase += ` inspired by their name`;
        }
        const fullPrompt = `${promptBase}. Image only, no text. Circular to ease cropping.`;

        // Log to botspam about starting the process
        let logMessageContent = `Generating profile picture for "${displayName}" - user account is ${accountAgeInYears} years old.`;
        if (overridePrompt) {
            if (isPrivate) {
                logMessageContent += ' Using custom prompt (private).';
            } else {
                logMessageContent += ` Using custom prompt: "${overridePrompt}".`;
            }
        }
        await logMessage(client, guild, logMessageContent);

        let finalPrompt = fullPrompt;

        // Handle use-existing-pfp for both Gemini and DALL-E
        if (useExistingPfp) {
            // Download the user's current avatar
            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 512 });
            if (avatarUrl) {
                const avatarPath = path.join(__dirname, '../../temp', `avatar_${userId}_${Date.now()}.png`);
                await downloadAndSaveImage(avatarUrl, avatarPath);

                if (engine === 'gemini') {
                    // Gemini: Use image directly for image-to-image generation
                    imageInput = avatarPath;

                    // Modify prompt to indicate we're using their existing avatar
                    finalPrompt = overridePrompt
                        ? `Using the input image as reference: Maintain the subject's pose and appearance while transforming them into a ${overridePrompt} in a highly detailed artistic style. Circular to ease cropping.`
                        : `Using the input image as reference: Transform this user's existing profile picture into a new creative version. Maintain the overall appearance but add artistic enhancements. Circular to ease cropping.`;

                    if (DEBUG) console.log(`DEBUG: Using existing avatar for Gemini image-to-image generation: ${avatarPath}`);
                } else if (engine === 'dalle') {
                    // DALL-E: Describe the image first (with caching) and incorporate into prompt
                    const imageHash = calculateImageHash(avatarPath);
                    let avatarDescription = getCachedImageDescription(imageHash);

                    if (avatarDescription) {
                        if (DEBUG) console.log(`DEBUG: Using cached image description for avatar: ${avatarDescription}`);
                    } else {
                        if (DEBUG) console.log(`DEBUG: Describing avatar image for DALL-E prompt enhancement`);
                        avatarDescription = await describeImage(avatarPath, avatarUrl, genderSensitive);
                        setCachedImageDescription(imageHash, avatarDescription);
                        if (DEBUG) console.log(`DEBUG: Cached new image description: ${avatarDescription}`);
                    }

                    // Incorporate the avatar description into the prompt
                    const basePrompt = overridePrompt
                        ? `Transform this profile picture described as: "${avatarDescription}" according to: ${overridePrompt}. Create a new artistic version while maintaining the key visual characteristics.`
                        : `Create a new artistic profile picture inspired by this existing avatar: "${avatarDescription}". Maintain the core visual elements but create a fresh, creative version.`;

                    finalPrompt = `${basePrompt}. Image only, no text. Circular to ease cropping.`;

                    // Clean up the avatar file since we don't need it for DALL-E (only the description)
                    if (fs.existsSync(avatarPath)) {
                        fs.unlinkSync(avatarPath);
                        if (DEBUG) console.log(`DEBUG: Cleaned up avatar file after description for DALL-E`);
                    }
                }
            } else {
                // Fallback if avatar download fails
                if (DEBUG) console.log(`DEBUG: Could not download avatar for use-existing-pfp, falling back to text-only generation`);
            }
        }

        // Only pass imageInput for Gemini (DALL-E doesn't support image-to-image)
        const imageResult = await generateImage(finalPrompt, engine, engine === 'gemini' ? { imageInput } : undefined);

        if (DEBUG) console.log(`DEBUG: Generated profile picture for ${displayName} using ${engine} engine`);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const profilePicPath = path.join(basePath, `${displayName}-profile-${timestamp}.png`);

        // Handle different return types: DALL-E returns URL, Gemini returns file path
        if (imageResult.startsWith('http') || imageResult.startsWith('https')) {
            // DALL-E: download from URL
            await downloadAndSaveImage(imageResult, profilePicPath);
        } else {
            // Gemini: copy from generated file path
            if (fs.existsSync(imageResult)) {
                try {
                    fs.copyFileSync(imageResult, profilePicPath);
                    // Clean up the temporary file created by Gemini
                    fs.unlinkSync(imageResult);
                } catch (error) {
                    // Clean up temp file even if copy fails
                    fs.unlinkSync(imageResult);
                    throw error;
                }
            } else {
                throw new Error('Generated image file not found');
            }
        }

        // Clean up the downloaded avatar file if it was used for image-to-image generation
        if (imageInput && fs.existsSync(imageInput)) {
            try {
                fs.unlinkSync(imageInput);
                if (DEBUG) console.log(`DEBUG: Cleaned up temporary avatar file: ${imageInput}`);
            } catch (cleanupError) {
                console.warn(`Warning: Failed to clean up temporary avatar file ${imageInput}:`, cleanupError);
            }
        }

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
        // Clean up the downloaded avatar file if it exists and an error occurred
        if (imageInput && fs.existsSync(imageInput)) {
            try {
                fs.unlinkSync(imageInput);
                if (DEBUG) console.log(`DEBUG: Cleaned up temporary avatar file after error: ${imageInput}`);
            } catch (cleanupError) {
                console.warn(`Warning: Failed to clean up temporary avatar file ${imageInput} after error:`, cleanupError);
            }
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('Error during profile picture generation:', errorMessage);

        // Log the error to botspam channel
        await logMessage(client, guild, `Error generating profile picture: ${errorMessage}`);

        // Try to send error message to the user who triggered the command
        try {
            const botspamChannel = guild.channels.cache.get(BOTSPAM_CHANNEL_ID) as TextChannel;
            if (botspamChannel?.isTextBased()) {
                await botspamChannel.send(`❌ Profile picture generation failed for "${displayName}": ${errorMessage}`);
            }
        } catch (sendError) {
            console.error('Failed to send error message to channel:', sendError);
        }
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