const { WELCOME_CHANNEL_NAME, WELCOME_PROMPT, OPENAI_API_KEY, WILDCARD, DEBUG, GENERAL_CHANNEL_ID } = require('./config');
const { logMessage } = require('./log');
const { readWelcomeCount, writeWelcomeCount } = require('./utils');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

let welcomeCount = readWelcomeCount();

const WILDCARD_PROMPT = (username) => `Generate a welcome image for the user "${username}", be inspired by that username to create an image that represents that username to the best of your abilities. Add the text "Welcome ${username}" to the image.`;

// Ensure the welcome_images directory exists
const welcomeImagesDir = path.join(__dirname, 'welcome_images');
if (!fs.existsSync(welcomeImagesDir)) {
    fs.mkdirSync(welcomeImagesDir);
}

/**
 * Posts a message to the general channel with a generated profile picture for a new member.
 *
 * @param {Client} client - The Discord client instance.
 * @param {GuildMember} member - The member to post the message for.
 * @param {string} profilePicPath - The path to the generated profile picture.
 * @return {Promise<void>}
 */
async function postToGeneral(client, member, profilePicPath) {
    const generalChannel = member.guild.channels.cache.get(GENERAL_CHANNEL_ID);
    if (generalChannel) {
        await generalChannel.send({
            content: `Hey <@${member.user.id}>, you don't have a profile pic yet - do you want to use this one we made for you, based on your username?`,
            files: [profilePicPath]
        });
    } else {
        if (DEBUG) console.warn(`General channel with ID ${GENERAL_CHANNEL_ID} not found`);
    }
}

// Function to describe the image using GPT-4 Vision API
async function describeImage(client, guild, imagePath) {
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
        if (DEBUG) console.error('Error describing image:', error.message);
        throw error;
    }
}

// Function to generate an image using DALL-E 3 with retry logic
async function generateImage(client, guild, prompt, retries = 3, delay = 2000) {
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
            return response.data.data[0].url;
        } catch (error) {
            if (DEBUG) console.error(`Error generating image (attempt ${attempt}): ${error.message}`);
            
            if (error.response && error.response.status === 504) {
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                    continue; // Retry the request
                } else {
                    throw new Error('Failed to generate image after multiple attempts due to 504 errors.');
                }
            } else {
                throw error; // Rethrow non-504 errors
            }
        }
    }
}

// Function to download an image from a URL and save it with a specific filename
async function downloadAndSaveImage(url, filepath) {
    const response = await axios({
        url,
        responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(filepath))
            .on('finish', () => resolve(filepath))
            .on('error', e => reject(e));
    });
}

// Function to get the full prompt for DALL-E
async function getFullPrompt(client, guild, member, username, avatarUrl) {
    if (member.user.avatar === null) {
        await logMessage(client, guild, "No profile pic, using simplified prompt.");
        return WILDCARD_PROMPT(username);
    }

    const randomNumber = Math.random() * 100;
    if (DEBUG) console.log(`Random number: ${randomNumber}, WILDCARD: ${WILDCARD}`);
    await logMessage(client, guild, `Random number: ${randomNumber}, WILDCARD: ${WILDCARD}`);

    if (randomNumber < WILDCARD) {
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

async function welcomeUser(client, member, forcePfp = false) {
    const guild = member.guild;
    const displayName = member.displayName; // Use display name
    const userId = member.user.id;
    const avatarUrl = member.user.displayAvatarURL({ format: 'png', dynamic: true });

    // Calculate account age in years
    const accountCreationDate = member.user.createdAt;
    const accountAgeInYears = ((Date.now() - accountCreationDate) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);

    // Simplified message for botspam
    await logMessage(client, guild, `Triggering welcome for "${displayName}" - user account is ${accountAgeInYears} years old.`);
    await logMessage(client, guild, { files: [avatarUrl] });

    if (DEBUG) console.log(`Welcome process started for ${displayName} with avatar URL: ${avatarUrl}`);

    try {
        let fullPrompt;

        // If the user has no profile pic or forcePfp is true, generate a profile picture
        if (member.user.avatar === null || forcePfp) {
            await logMessage(client, guild, forcePfp ? "Forcing profile pic generation." : "No profile pic, generating a profile picture based on username.");
            fullPrompt = `To the best of your ability, create a discord profile picture for the user "${displayName}" inspired by their name. Image only, no text. Circular to ease cropping.`;
        } else {
            const randomNumber = Math.random() * 100;
            if (DEBUG) console.log(`Random number: ${randomNumber}, WILDCARD: ${WILDCARD}`);
            await logMessage(client, guild, `Random number: ${randomNumber}, WILDCARD: ${WILDCARD}`);

            if (randomNumber < WILDCARD) {
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
            await logMessage(client, guild, { files: [dalleImagePath] });
            await logMessage(client, guild, `Sending to #${WELCOME_CHANNEL_NAME}`);

            // Send the welcome message with the downloaded and re-uploaded image
            const welcomeChannel = guild.channels.cache.find(channel => channel.name === WELCOME_CHANNEL_NAME);
            if (welcomeChannel) {
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
        if (DEBUG) console.error('Error during the welcome process:', error.message);
        await logMessage(client, guild, `Error during the welcome process: ${error.message}`);
    }
}

/**
 * Generates a profile picture for users without a profile picture based on their username.
 *
 * @param {Client} client - The Discord client instance.
 * @param {GuildMember} member - The member to generate the profile picture for.
 * @return {Promise<void>}
 */
async function generateProfilePicture(client, member) {
    const guild = member.guild;
    const displayName = member.displayName; // Use display name
    const userId = member.user.id;

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
        if (DEBUG) console.error('Error during profile picture generation:', error.message);
        await logMessage(client, guild, `Error generating profile picture: ${error.message}`);
    }
}

module.exports = {
    welcomeUser,
    generateProfilePicture, // Export the new function
    welcomeCount
};
