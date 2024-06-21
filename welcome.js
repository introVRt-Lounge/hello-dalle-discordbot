const { WELCOME_CHANNEL_NAME, WELCOME_PROMPT, OPENAI_API_KEY, WILDCARD, DEBUG } = require('./config');
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
                        { type: 'text', text: "This image is used as a profile pic, describe the main feature in one concise sentence fragment without any preamble or user reference, in the form of '<description>'." },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 50 // Limit the response length
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
        await logMessage(client, guild, "No profile pic, going wildcard.");
        if (DEBUG) console.log(`Using wildcard prompt for user: ${username}`);
        return WILDCARD_PROMPT(username);
    }

    const randomNumber = Math.random() * 100;
    if (DEBUG) console.log(`Random number: ${randomNumber}, WILDCARD: ${WILDCARD}`);
    await logMessage(client, guild, `Random number: ${randomNumber}, WILDCARD: ${WILDCARD}`);

    if (randomNumber < WILDCARD) {
        if (DEBUG) console.log(`Using wildcard prompt for user: ${username}`);
        return WILDCARD_PROMPT(username);
    } else {
        // Download the user's avatar
        if (DEBUG) console.log(`Downloading avatar for user ${username}`);
        const avatarResponse = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
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

// Function to handle the welcome process
async function welcomeUser(client, member) {
    const guild = member.guild;
    const username = member.user.username;
    const userId = member.user.id;
    const avatarUrl = member.user.displayAvatarURL({ format: 'png', dynamic: true });

    // Calculate account age in years
    const accountCreationDate = member.user.createdAt;
    const accountAgeInYears = ((Date.now() - accountCreationDate) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);

    // Simplified message for botspam
    await logMessage(client, guild, `Triggering welcome for "${username}" - user account is ${accountAgeInYears} years old.`);
    await logMessage(client, guild, { files: [avatarUrl] });

    if (DEBUG) console.log(`Welcome process started for ${username} with avatar URL: ${avatarUrl}`);

    try {
        const fullPrompt = await getFullPrompt(client, guild, member, username, avatarUrl);
        await logMessage(client, guild, `Prompt: ${fullPrompt}`);

        const imageUrl = await generateImage(client, guild, fullPrompt);
        if (DEBUG) console.log(`Generated image URL for ${username}: ${imageUrl}`);

        // Download the DALL-E image and re-upload to Discord
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dalleImagePath = path.join(welcomeImagesDir, `${username}-${timestamp}.png`);
        await downloadAndSaveImage(imageUrl, dalleImagePath);
        if (DEBUG) console.log(`DALL-E image downloaded to ${dalleImagePath}`);

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

        // Increment the welcome count and save it
        welcomeCount++;
        writeWelcomeCount(welcomeCount);
        await logMessage(client, guild, `Total users welcomed: ${welcomeCount}`);
    } catch (error) {
        if (DEBUG) console.error('Error during the welcome process:', error.message);
        await logMessage(client, guild, `Error during the welcome process: ${error.message}`);
    }
}

module.exports = {
    welcomeUser,
    welcomeCount
};
