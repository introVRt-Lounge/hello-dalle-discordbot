import { DEBUG, OPENAI_API_KEY } from '../config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Ensure the temp directory exists
const tempDir = path.join(__dirname, '../../temp');  // Changed path to avoid using 'dist'
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true }); // Create the temp directory if it doesn't exist
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

        return response.data.data[0].url; // Return generated image URL
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate image: ${errorMessage}`);
    }
}

// Function to describe the image using GPT-4 Vision API
export async function describeImage(imagePath: string, imageUrl: string): Promise<string> {
    if (DEBUG) console.log(`DEBUG: Describing image from URL: ${imageUrl}`);
    if (DEBUG) console.log(`DEBUG: Local image path: ${imagePath}`);

    try {
        // Read the image from the filesystem and encode it as base64
        const image = fs.readFileSync(imagePath, { encoding: 'base64' });
        const base64Image = `data:image/png;base64,${image}`;  // Add correct MIME type

        // In DEBUG mode, save the base64 string to a file for inspection
        if (DEBUG) {
            const base64FilePath = path.join(tempDir, `base64_image_${Date.now()}.txt`);
            fs.writeFileSync(base64FilePath, base64Image);
            console.log(`DEBUG: Full base64 image string saved to: ${base64FilePath}`);
        }

        // Prepare the request payload for OpenAI GPT-4 Vision
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4-turbo',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: "What’s in this image?"
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: base64Image  // Send the base64 image as an 'image_url'
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
