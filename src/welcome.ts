import { Client, Guild, GuildMember, TextChannel } from 'discord.js';
import { WELCOME_CHANNEL_NAME, WELCOME_PROMPT, OPENAI_API_KEY, getWILDCARD, DEBUG, GENERAL_CHANNEL_ID } from '../src/config';
import { logMessage } from '../src/log';
import { readWelcomeCount, writeWelcomeCount } from '../src/utils';
import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';

export let welcomeCount = readWelcomeCount();

const WILDCARD_PROMPT = (username: string): string =>
    `Generate a welcome image for the user "${username}", be inspired by that username to create an image that represents that username to the best of your abilities. Add the text "Welcome ${username}" to the image.`;

// Ensure the welcome_images directory exists
const welcomeImagesDir: string = path.join(__dirname, 'welcome_images');
if (!fs.existsSync(welcomeImagesDir)) {
    fs.mkdirSync(welcomeImagesDir);
}

async function postToGeneral(client: Client, member: GuildMember, profilePicPath: string): Promise<void> {
    const generalChannel = member.guild.channels.cache.get(GENERAL_CHANNEL_ID) as TextChannel;
    if (generalChannel?.isTextBased()) {
        await generalChannel.send({
            content: `Hey <@${member.user.id}>, you don't have a profile pic yet - do you want to use this one we made for you, based on your username?`,
            files: [profilePicPath]
        });
    } else {
        if (DEBUG) console.warn(`General channel with ID ${GENERAL_CHANNEL_ID} not found or is not a text channel.`);
    }
}

// Function to describe the image using GPT-4 Vision API
async function describeImage(client: Client, guild: Guild, imagePath: string): Promise<string> {
    if (DEBUG) console.log(`Describing image: ${imagePath}`);
    const image = fs.readFileSync(imagePath, { encoding: 'base64' });

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4-turbo',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: "This image is used as a profile pic, describe the main feature (and if there is one other notable aspect, that too) in one concise sentence fragment without any preamble, in the form of '<description>'." },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 30 // Limit the response length
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (DEBUG) console.log(`Image described: ${response.data.choices[0].message.content}`);
        return response.data.choices[0].message.content;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('Error describing image:', errorMessage);
        throw new Error(errorMessage);
    }
}

// Function to generate an image using DALL-E 3 with retry logic
async function generateImage(client: Client, guild: Guild, prompt: string, retries = 3, delay = 2000): Promise<string> {
    if (DEBUG) console.log(`Generating image with prompt: ${prompt}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.post('https://api.openai.com/v1/images/generations', {
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: "1024x1024"
            }, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (DEBUG) console.log(`Image generated: ${response.data.data[0].url}`);
            return response.data.data[0].url; // Return the generated image URL
        } catch (error) {
            // Check if the error is an AxiosError
            if (axios.isAxiosError(error)) {
                // Error is an AxiosError with a response object
                if (error.response && error.response.status === 504) {
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, delay * attempt));
                        continue; // Retry the request
                    } else {
                        throw new Error('Failed to generate image after multiple attempts due to 504 errors.');
                    }
                }
            }
            // If the error is not an AxiosError or a non-504 error, rethrow the error
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    // This line will be reached only if all retries failed.
    throw new Error('Failed to generate image after multiple attempts.');
}

// Function to download an image from a URL and save it with a specific filename
async function downloadAndSaveImage(url: string, filepath: string): Promise<string> {
    const response = await axios({
        url,
        responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(filepath))
            .on('finish', () => resolve(filepath))
            .on('error', (e: unknown) => {
                const errorMessage = e instanceof Error ? e.message : String(e);
                reject(new Error(errorMessage));
            });
    });
}

// Function to get the full prompt for DALL-E
async function getFullPrompt(client: Client, guild: Guild, member: GuildMember, username: string, avatarUrl: string): Promise<string> {
    if (member.user.avatar === null) {
        await logMessage(client, guild, "No profile pic, using simplified prompt.");
        return WILDCARD_PROMPT(username);
    }

    const randomNumber = Math.random() * 100;
    if (DEBUG) console.log(`Random number: ${randomNumber}, WILDCARD: ${getWILDCARD()}`);
    await logMessage(client, guild, `Random number: ${randomNumber}, WILDCARD: ${getWILDCARD()}`);

    if (randomNumber < getWILDCARD()) {
        if (DEBUG) console.log(`Using wildcard prompt for user: ${username}`);
        return WILDCARD_PROMPT(username);
    } else {
        // Download the user's avatar with higher resolution
        const highResAvatarUrl = `${avatarUrl}?size=4096`;
        if (DEBUG) console.log(`Downloading avatar for user ${username}`);
        const avatarResponse = await axios.get(highResAvatarUrl, { responseType: 'arraybuffer' });
        const avatarPath = path.join(__dirname, 'avatar.png');
        fs.writeFileSync(avatarPath, avatarResponse.data);
        if (DEBUG) console.log(`Avatar downloaded for user ${username} at ${avatarPath}`);

        // Describe the avatar image using GPT-4 Vision
        const description = await describeImage(client, guild, avatarPath);
        if (DEBUG) console.log(`Image description for ${username}: ${description}`);

        // Generate the DALL-E image using the welcome prompt and the description
        let fullPrompt = WELCOME_PROMPT.replace('{username}', username);
        fullPrompt = fullPrompt.replace('{avatar}', description); // Replace {avatar} with the description
        return fullPrompt;
    }
}

export async function welcomeUser(client: Client, member: GuildMember, forcePfp = false): Promise<void> {
    const guild = member.guild;
    const displayName = member.displayName; // Use display name
    const userId = member.user.id;
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', forceStatic: false });

    // Calculate account age in years
    const accountCreationDate = member.user.createdAt.getTime(); // Get the timestamp in milliseconds
    const accountAgeInYears = ((Date.now() - accountCreationDate) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);

    // Simplified message for botspam
    await logMessage(client, guild, `Triggering welcome for "${displayName}" - user account is ${accountAgeInYears} years old.`);
    await logMessage(client, guild, `Avatar URL: ${avatarUrl}`);

    if (DEBUG) console.log(`Welcome process started for ${displayName} with avatar URL: ${avatarUrl}`);

    try {
        let fullPrompt;

        // If the user has no profile pic or forcePfp is true, generate a profile picture
        if (member.user.avatar === null || forcePfp) {
            await logMessage(client, guild, forcePfp ? "Forcing profile pic generation." : "No profile pic, generating a profile picture based on username.");
            fullPrompt = `To the best of your ability, create a discord profile picture for the user "${displayName}" inspired by their name. Image only, no text. Circular to ease cropping.`;
        } else {
            const randomNumber = Math.random() * 100;
            if (DEBUG) console.log(`Random number: ${randomNumber}, WILDCARD: ${getWILDCARD()}`);
            await logMessage(client, guild, `Random number: ${randomNumber}, WILDCARD: ${getWILDCARD()}`);

            if (randomNumber < getWILDCARD()) {
                if (DEBUG) console.log(`Using wildcard prompt for user: ${displayName}`);
                fullPrompt = WILDCARD_PROMPT(displayName); // Use the display name in the wildcard prompt
            } else {
                // Download the user's avatar with higher resolution
                const highResAvatarUrl = `${avatarUrl}?size=4096`;
                if (DEBUG) console.log(`Downloading avatar for user ${displayName}`);
                const avatarResponse = await axios.get(highResAvatarUrl, { responseType: 'arraybuffer' });
                const avatarPath = path.join(__dirname, 'avatar.png');
                fs.writeFileSync(avatarPath, avatarResponse.data);
                if (DEBUG) console.log(`Avatar downloaded for user ${displayName} at ${avatarPath}`);

                // Describe the avatar image using GPT-4 Vision
                const description = await describeImage(client, guild, avatarPath);
                if (DEBUG) console.log(`Image description for ${displayName}: ${description}`);

                // Generate the DALL-E image using the welcome prompt and the description
                fullPrompt = WELCOME_PROMPT.replace('{username}', displayName);
                fullPrompt = fullPrompt.replace('{avatar}', description); // Replace {avatar} with the description
            }
        }

        await logMessage(client, guild, `Prompt: ${fullPrompt}`);
        const imageUrl = await generateImage(client, guild, fullPrompt);
        if (DEBUG) console.log(`Generated image URL for ${displayName}: ${imageUrl}`);

        // Download the DALL-E image and re-upload to Discord
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dalleImagePath = path.join(welcomeImagesDir, `${displayName}-${timestamp}.png`);
        await downloadAndSaveImage(imageUrl, dalleImagePath);
        if (DEBUG) console.log(`DALL-E image downloaded to ${dalleImagePath}`);

        if (member.user.avatar === null || forcePfp) {
            // Post to #general channel for users without a profile pic
            await postToGeneral(client, member, dalleImagePath);
        } else {
            // Simplified message for botspam
            await logMessage(client, guild, `DALL-E Image Path: ${dalleImagePath}`);

            // Send the welcome message with the downloaded and re-uploaded image
            const welcomeChannel = guild.channels.cache.find(channel => channel.name === WELCOME_CHANNEL_NAME) as TextChannel;
            if (welcomeChannel?.isTextBased()) {
                await welcomeChannel.send({
                    content: `Welcome, <@${userId}>!`,
                    files: [dalleImagePath]
                });
            } else {
                console.log('Welcome channel not found.');
            }
        }

        // Increment the welcome count and save it
        welcomeCount++;
        writeWelcomeCount(welcomeCount);
        await logMessage(client, guild, `Total users welcomed: ${welcomeCount}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('Error during the welcome process:', errorMessage);
        await logMessage(client, guild, `Error during the welcome process: ${errorMessage}`);
    }
}

export async function generateProfilePicture(client: Client, member: GuildMember): Promise<void> {
    const guild = member.guild;
    const displayName = member.displayName; // Use display name

    try {
        // Generate a profile picture based on the username
        const fullPrompt = `To the best of your ability, create a discord profile picture for the user "${displayName}" inspired by their name. Image only, no text. Circular to ease cropping.`;
        await logMessage(client, guild, `Generating profile picture for user "${displayName}" based on their username.`);

        const imageUrl = await generateImage(client, guild, fullPrompt);
        if (DEBUG) console.log(`Generated profile picture URL for ${displayName}: ${imageUrl}`);

        // Download the DALL-E image and re-upload to Discord
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dalleImagePath = path.join(welcomeImagesDir, `${displayName}-profile-${timestamp}.png`);
        await downloadAndSaveImage(imageUrl, dalleImagePath);
        if (DEBUG) console.log(`Profile picture downloaded to ${dalleImagePath}`);

        // Post to #general channel suggesting the profile picture
        await postToGeneral(client, member, dalleImagePath);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('Error during profile picture generation:', errorMessage);
        await logMessage(client, guild, `Error generating profile picture: ${errorMessage}`);
    }
}
