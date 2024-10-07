import { DEBUG, OPENAI_API_KEY, WATERMARK_PATH } from '../config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Ensure the temp directory exists
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Ensure the welcome_images directory exists
const welcomeImagesDir = path.join(__dirname, '../../welcome_images');
if (!fs.existsSync(welcomeImagesDir)) {
    fs.mkdirSync(welcomeImagesDir, { recursive: true });
}

// Function to generate image via API (DALL-E or other)
export async function generateImage(prompt: string): Promise<string> {
    console.log(`DEBUG: Generating image with prompt: ${prompt}`);
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

        return response.data.data[0].url;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate image: ${errorMessage}`);
    }
}

// Function to add watermark to the image (optional based on WATERMARK_PATH)
export async function addWatermark(imagePath: string, watermarkPath: string | undefined): Promise<string> {
    try {
        const outputImagePath = path.join(welcomeImagesDir, `watermarked_${Date.now()}.png`);

        if (!watermarkPath) {
            return imagePath;
        }

        const watermark = await sharp(watermarkPath).resize({ width: 200 }).toBuffer();

        await sharp(imagePath)
            .composite([{
                input: watermark,
                gravity: 'southeast'
            }])
            .toFile(outputImagePath);

        return outputImagePath;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to add watermark: ${errorMessage}`);
    }
}

// Function to describe the image using GPT-4 Vision API
export async function describeImage(imagePath: string, imageUrl: string, genderSensitive: boolean): Promise<string> {
    if (DEBUG) console.log(`DEBUG: Describing image from URL: ${imageUrl}`);
    if (DEBUG) console.log(`DEBUG: Local image path: ${imagePath}`);

    try {
        const image = fs.readFileSync(imagePath, { encoding: 'base64' });
        const base64Image = `data:image/png;base64,${image}`;

        if (DEBUG) {
            const base64FilePath = path.join(tempDir, `base64_image_${Date.now()}.txt`);
            fs.writeFileSync(base64FilePath, base64Image);
            console.log(`DEBUG: Full base64 image string saved to: ${base64FilePath}`);
        }

        const prompt = genderSensitive
            ? "This image is used as a discord profile picture. Describe its main features, especially any characteristics (such as hairstyle, clothing, or accessories) that might help in adjusting for personalization. Please provide a concise description in the form of '<description>' without using explicit gender labels unless the characteristics are very apparent. Limit your response to around 50 tokens."
            : "This image is used as a discord profile picture. Describe the most notable visual feature concisely, in the form of '<description>'. Focus only on distinctive elements like colors, shapes, or items without drawing any conclusions about personal characteristics. Limit your response to around 50 tokens.";

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4-turbo',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: base64Image
                            }
                        }
                    ]
                }
            ],
            max_tokens: 50 // Explicit token limit for the response
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (DEBUG) console.log(`DEBUG: Image described: ${response.data.choices[0].message.content}`);
        return response.data.choices[0].message.content;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (DEBUG) console.error('DEBUG: Error describing image:', errorMessage);
        throw new Error(errorMessage);
    }
}

// Function to download and save image
export async function downloadAndSaveImage(url: string, filepath: string): Promise<string> {
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

// Function to handle welcome image generation with watermark
export async function generateWelcomeImage(prompt: string): Promise<string> {
    const imageUrl = await generateImage(prompt);
    const imagePath = path.join(tempDir, `welcome_image_${Date.now()}.png`);

    await downloadAndSaveImage(imageUrl, imagePath);

    const watermarkedImagePath = WATERMARK_PATH ? await addWatermark(imagePath, WATERMARK_PATH) : imagePath;

    return watermarkedImagePath;
}
