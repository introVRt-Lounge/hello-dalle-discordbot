"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.welcomeCount = void 0;
exports.welcomeUser = welcomeUser;
exports.generateProfilePicture = generateProfilePicture;
const config_1 = require("../src/config");
const log_1 = require("../src/log");
const utils_1 = require("../src/utils");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.welcomeCount = (0, utils_1.readWelcomeCount)();
const WILDCARD_PROMPT = (username) => `Generate a welcome image for the user "${username}", be inspired by that username to create an image that represents that username to the best of your abilities. Add the text "Welcome ${username}" to the image.`;
// Ensure the welcome_images directory exists
const welcomeImagesDir = path_1.default.join(__dirname, 'welcome_images');
if (!fs_1.default.existsSync(welcomeImagesDir)) {
    fs_1.default.mkdirSync(welcomeImagesDir);
}
function postToGeneral(client, member, profilePicPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const generalChannel = member.guild.channels.cache.get(config_1.GENERAL_CHANNEL_ID);
        if (generalChannel === null || generalChannel === void 0 ? void 0 : generalChannel.isTextBased()) {
            yield generalChannel.send({
                content: `Hey <@${member.user.id}>, you don't have a profile pic yet - do you want to use this one we made for you, based on your username?`,
                files: [profilePicPath]
            });
        }
        else {
            if (config_1.DEBUG)
                console.warn(`General channel with ID ${config_1.GENERAL_CHANNEL_ID} not found or is not a text channel.`);
        }
    });
}
// Function to describe the image using GPT-4 Vision API
function describeImage(client, guild, imagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (config_1.DEBUG)
            console.log(`Describing image: ${imagePath}`);
        const image = fs_1.default.readFileSync(imagePath, { encoding: 'base64' });
        try {
            const response = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', {
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
                    'Authorization': `Bearer ${config_1.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (config_1.DEBUG)
                console.log(`Image described: ${response.data.choices[0].message.content}`);
            return response.data.choices[0].message.content;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (config_1.DEBUG)
                console.error('Error describing image:', errorMessage);
            throw new Error(errorMessage);
        }
    });
}
// Function to generate an image using DALL-E 3 with retry logic
function generateImage(client_1, guild_1, prompt_1) {
    return __awaiter(this, arguments, void 0, function* (client, guild, prompt, retries = 3, delay = 2000) {
        if (config_1.DEBUG)
            console.log(`Generating image with prompt: ${prompt}`);
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = yield axios_1.default.post('https://api.openai.com/v1/images/generations', {
                    model: 'dall-e-3',
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024"
                }, {
                    headers: {
                        'Authorization': `Bearer ${config_1.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (config_1.DEBUG)
                    console.log(`Image generated: ${response.data.data[0].url}`);
                return response.data.data[0].url; // Return the generated image URL
            }
            catch (error) {
                // Check if the error is an AxiosError
                if (axios_1.default.isAxiosError(error)) {
                    // Error is an AxiosError with a response object
                    if (error.response && error.response.status === 504) {
                        if (attempt < retries) {
                            yield new Promise(resolve => setTimeout(resolve, delay * attempt));
                            continue; // Retry the request
                        }
                        else {
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
    });
}
// Function to download an image from a URL and save it with a specific filename
function downloadAndSaveImage(url, filepath) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield (0, axios_1.default)({
            url,
            responseType: 'stream'
        });
        return new Promise((resolve, reject) => {
            response.data.pipe(fs_1.default.createWriteStream(filepath))
                .on('finish', () => resolve(filepath))
                .on('error', (e) => {
                const errorMessage = e instanceof Error ? e.message : String(e);
                reject(new Error(errorMessage));
            });
        });
    });
}
// Function to get the full prompt for DALL-E
function getFullPrompt(client, guild, member, username, avatarUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        if (member.user.avatar === null) {
            yield (0, log_1.logMessage)(client, guild, "No profile pic, using simplified prompt.");
            return WILDCARD_PROMPT(username);
        }
        const randomNumber = Math.random() * 100;
        if (config_1.DEBUG)
            console.log(`Random number: ${randomNumber}, WILDCARD: ${(0, config_1.getWILDCARD)()}`);
        yield (0, log_1.logMessage)(client, guild, `Random number: ${randomNumber}, WILDCARD: ${(0, config_1.getWILDCARD)()}`);
        if (randomNumber < (0, config_1.getWILDCARD)()) {
            if (config_1.DEBUG)
                console.log(`Using wildcard prompt for user: ${username}`);
            return WILDCARD_PROMPT(username);
        }
        else {
            // Download the user's avatar with higher resolution
            const highResAvatarUrl = `${avatarUrl}?size=4096`;
            if (config_1.DEBUG)
                console.log(`Downloading avatar for user ${username}`);
            const avatarResponse = yield axios_1.default.get(highResAvatarUrl, { responseType: 'arraybuffer' });
            const avatarPath = path_1.default.join(__dirname, 'avatar.png');
            fs_1.default.writeFileSync(avatarPath, avatarResponse.data);
            if (config_1.DEBUG)
                console.log(`Avatar downloaded for user ${username} at ${avatarPath}`);
            // Describe the avatar image using GPT-4 Vision
            const description = yield describeImage(client, guild, avatarPath);
            if (config_1.DEBUG)
                console.log(`Image description for ${username}: ${description}`);
            // Generate the DALL-E image using the welcome prompt and the description
            let fullPrompt = config_1.WELCOME_PROMPT.replace('{username}', username);
            fullPrompt = fullPrompt.replace('{avatar}', description); // Replace {avatar} with the description
            return fullPrompt;
        }
    });
}
function welcomeUser(client_1, member_1) {
    return __awaiter(this, arguments, void 0, function* (client, member, forcePfp = false) {
        const guild = member.guild;
        const displayName = member.displayName; // Use display name
        const userId = member.user.id;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', forceStatic: false });
        // Calculate account age in years
        const accountCreationDate = member.user.createdAt.getTime(); // Get the timestamp in milliseconds
        const accountAgeInYears = ((Date.now() - accountCreationDate) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
        // Simplified message for botspam
        yield (0, log_1.logMessage)(client, guild, `Triggering welcome for "${displayName}" - user account is ${accountAgeInYears} years old.`);
        yield (0, log_1.logMessage)(client, guild, `Avatar URL: ${avatarUrl}`);
        if (config_1.DEBUG)
            console.log(`Welcome process started for ${displayName} with avatar URL: ${avatarUrl}`);
        try {
            let fullPrompt;
            // If the user has no profile pic or forcePfp is true, generate a profile picture
            if (member.user.avatar === null || forcePfp) {
                yield (0, log_1.logMessage)(client, guild, forcePfp ? "Forcing profile pic generation." : "No profile pic, generating a profile picture based on username.");
                fullPrompt = `To the best of your ability, create a discord profile picture for the user "${displayName}" inspired by their name. Image only, no text. Circular to ease cropping.`;
            }
            else {
                const randomNumber = Math.random() * 100;
                if (config_1.DEBUG)
                    console.log(`Random number: ${randomNumber}, WILDCARD: ${(0, config_1.getWILDCARD)()}`);
                yield (0, log_1.logMessage)(client, guild, `Random number: ${randomNumber}, WILDCARD: ${(0, config_1.getWILDCARD)()}`);
                if (randomNumber < (0, config_1.getWILDCARD)()) {
                    if (config_1.DEBUG)
                        console.log(`Using wildcard prompt for user: ${displayName}`);
                    fullPrompt = WILDCARD_PROMPT(displayName); // Use the display name in the wildcard prompt
                }
                else {
                    // Download the user's avatar with higher resolution
                    const highResAvatarUrl = `${avatarUrl}?size=4096`;
                    if (config_1.DEBUG)
                        console.log(`Downloading avatar for user ${displayName}`);
                    const avatarResponse = yield axios_1.default.get(highResAvatarUrl, { responseType: 'arraybuffer' });
                    const avatarPath = path_1.default.join(__dirname, 'avatar.png');
                    fs_1.default.writeFileSync(avatarPath, avatarResponse.data);
                    if (config_1.DEBUG)
                        console.log(`Avatar downloaded for user ${displayName} at ${avatarPath}`);
                    // Describe the avatar image using GPT-4 Vision
                    const description = yield describeImage(client, guild, avatarPath);
                    if (config_1.DEBUG)
                        console.log(`Image description for ${displayName}: ${description}`);
                    // Generate the DALL-E image using the welcome prompt and the description
                    fullPrompt = config_1.WELCOME_PROMPT.replace('{username}', displayName);
                    fullPrompt = fullPrompt.replace('{avatar}', description); // Replace {avatar} with the description
                }
            }
            yield (0, log_1.logMessage)(client, guild, `Prompt: ${fullPrompt}`);
            const imageUrl = yield generateImage(client, guild, fullPrompt);
            if (config_1.DEBUG)
                console.log(`Generated image URL for ${displayName}: ${imageUrl}`);
            // Download the DALL-E image and re-upload to Discord
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const dalleImagePath = path_1.default.join(welcomeImagesDir, `${displayName}-${timestamp}.png`);
            yield downloadAndSaveImage(imageUrl, dalleImagePath);
            if (config_1.DEBUG)
                console.log(`DALL-E image downloaded to ${dalleImagePath}`);
            if (member.user.avatar === null || forcePfp) {
                // Post to #general channel for users without a profile pic
                yield postToGeneral(client, member, dalleImagePath);
            }
            else {
                // Simplified message for botspam
                yield (0, log_1.logMessage)(client, guild, `DALL-E Image Path: ${dalleImagePath}`);
                // Send the welcome message with the downloaded and re-uploaded image
                const welcomeChannel = guild.channels.cache.find(channel => channel.name === config_1.WELCOME_CHANNEL_NAME);
                if (welcomeChannel === null || welcomeChannel === void 0 ? void 0 : welcomeChannel.isTextBased()) {
                    yield welcomeChannel.send({
                        content: `Welcome, <@${userId}>!`,
                        files: [dalleImagePath]
                    });
                }
                else {
                    console.log('Welcome channel not found.');
                }
            }
            // Increment the welcome count and save it
            exports.welcomeCount++;
            (0, utils_1.writeWelcomeCount)(exports.welcomeCount);
            yield (0, log_1.logMessage)(client, guild, `Total users welcomed: ${exports.welcomeCount}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (config_1.DEBUG)
                console.error('Error during the welcome process:', errorMessage);
            yield (0, log_1.logMessage)(client, guild, `Error during the welcome process: ${errorMessage}`);
        }
    });
}
function generateProfilePicture(client, member) {
    return __awaiter(this, void 0, void 0, function* () {
        const guild = member.guild;
        const displayName = member.displayName; // Use display name
        try {
            // Generate a profile picture based on the username
            const fullPrompt = `To the best of your ability, create a discord profile picture for the user "${displayName}" inspired by their name. Image only, no text. Circular to ease cropping.`;
            yield (0, log_1.logMessage)(client, guild, `Generating profile picture for user "${displayName}" based on their username.`);
            const imageUrl = yield generateImage(client, guild, fullPrompt);
            if (config_1.DEBUG)
                console.log(`Generated profile picture URL for ${displayName}: ${imageUrl}`);
            // Download the DALL-E image and re-upload to Discord
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const dalleImagePath = path_1.default.join(welcomeImagesDir, `${displayName}-profile-${timestamp}.png`);
            yield downloadAndSaveImage(imageUrl, dalleImagePath);
            if (config_1.DEBUG)
                console.log(`Profile picture downloaded to ${dalleImagePath}`);
            // Post to #general channel suggesting the profile picture
            yield postToGeneral(client, member, dalleImagePath);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (config_1.DEBUG)
                console.error('Error during profile picture generation:', errorMessage);
            yield (0, log_1.logMessage)(client, guild, `Error generating profile picture: ${errorMessage}`);
        }
    });
}
