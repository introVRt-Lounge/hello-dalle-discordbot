const { WELCOME_CHANNEL_NAME, WELCOME_PROMPT, OPENAI_API_KEY, WILDCARD } = require('./config');
const { logMessage } = require('./log');
const { readWelcomeCount, writeWelcomeCount } = require('./utils');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

let welcomeCount = readWelcomeCount();

// Function to describe the image using GPT-4 Vision API
async function describeImage(client, guild, imagePath) {
    await logMessage(client, guild, `Describing image: ${imagePath}`);
    const image = fs.readFileSync(imagePath, { encoding: 'base64' });

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4-turbo',
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: "This image is used as a profile pic, describe the main feature in one short sentence fragment with no preamble. I want the output to be akin to 'users avatar is a <sentence fragment>'." },
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

    await logMessage(client, guild, `Image described: ${response.data.choices[0].message.content}`);
    return response.data.choices[0].message.content;
}

// Function to generate an image using DALL-E 3
async function generateImage(client, guild, prompt) {
    await logMessage(client, guild, `Generating image with prompt: ${prompt}`);
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

    await logMessage(client, guild, `Image generated: ${response.data.data[0].url}`);
    return response.data.data[0].url;
}

// Function to download an image from a URL
async function downloadImage(url, filepath) {
    const response = await axios({
        url,
        responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(filepath))
            .on('finish', () => resolve())
            .on('error', e => reject(e));
    });
}

// Function to handle the welcome process
async function welcomeUser(client, member) {
    const guild = member.guild;
    const username = member.user.username;
    const userId = member.user.id;
    const avatarUrl = member.user.displayAvatarURL({ format: 'png', dynamic: true });

    await logMessage(client, guild, `Triggering welcome process for: ${username}, Avatar URL: ${avatarUrl}`);

    // Determine the prompt to use
    let fullPrompt;
    if (Math.random() * 100 < WILDCARD) {
        fullPrompt = `Generate a welcome image for the user "${username}", be inspired by that username to create an image that represents that username to the best of your abilities. Add the text "Welcome ${username}" to the image.`;
        await logMessage(client, guild, `Using wildcard prompt for user: ${username}`);
    } else {
        // Check if the user has a default avatar
        if (member.user.avatar === null) {
            await logMessage(client, guild, `User ${username} does not have a custom avatar. Skipping image generation.`);
            return;
        }

        try {
            // Download the user's avatar
            await logMessage(client, guild, `Downloading avatar for user ${username}`);
            const avatarResponse = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
            const avatarPath = path.join(__dirname, 'avatar.png');
            fs.writeFileSync(avatarPath, avatarResponse.data);
            await logMessage(client, guild, `Avatar downloaded for user ${username} at ${avatarPath}`);

            // Describe the avatar image using GPT-4 Vision
            const description = await describeImage(client, guild, avatarPath);
            await logMessage(client, guild, `Image description for ${username}: ${description}`);

            // Generate the DALL-E image using the welcome prompt and the description
            fullPrompt = WELCOME_PROMPT.replace('{username}', username);
            fullPrompt = fullPrompt.replace('{avatar}', description); // Replace {avatar} with the description
        } catch (error) {
            await logMessage(client, guild, `Error generating image for ${username}: ${error.message}`);
            return;
        }
    }
    
    await logMessage(client, guild, `Full prompt for DALL-E: ${fullPrompt}`); // Debug log for full prompt
    const imageUrl = await generateImage(client, guild, fullPrompt);
    await logMessage(client, guild, `Generated image URL for ${username}: ${imageUrl}`);

    // Download the DALL-E image and re-upload to Discord
    const dalleImagePath = path.join(__dirname, 'dalle_image.png');
    await downloadImage(imageUrl, dalleImagePath);
    await logMessage(client, guild, `DALL-E image downloaded to ${dalleImagePath}`);

    // Send the welcome message with the downloaded and re-uploaded image
    const welcomeChannel = guild.channels.cache.find(channel => channel.name === WELCOME_CHANNEL_NAME);
    if (welcomeChannel) {
        await logMessage(client, guild, `Sending welcome message to ${WELCOME_CHANNEL_NAME} channel`);
        await welcomeChannel.send({
            content: `Welcome, <@${userId}>!`,
            files: [dalleImagePath]
        });
    } else {
        await logMessage(client, guild, 'Welcome channel not found.');
    }

    // Increment the welcome count and save it
    welcomeCount++;
    writeWelcomeCount(welcomeCount);
    await logMessage(client, guild, `Total users welcomed: ${welcomeCount}`);
}

module.exports = {
    welcomeUser,
    welcomeCount
};
