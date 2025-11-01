import { DEBUG, OPENAI_API_KEY, WATERMARK_PATH } from '../config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { generateImageWithGemini, GeminiModelType } from '../services/geminiService';

// Ensure the temp directory exists
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Use the mounted welcome_images directory (from docker volume)
// In container: /usr/src/app/welcome_images (mounted from docker volume)
// In development: fallback to relative path
const welcomeImagesDir = process.env.NODE_ENV === 'production'
    ? '/usr/src/app/welcome_images'
    : path.join(__dirname, '../../welcome_images');

if (!fs.existsSync(welcomeImagesDir)) {
    fs.mkdirSync(welcomeImagesDir, { recursive: true });
}

// Types for image generation
export type ImageEngine = 'dalle' | 'gemini';

export interface ImageGenerationOptions {
  prompt: string;
  engine?: ImageEngine;
  geminiModel?: GeminiModelType;
  imageInput?: string; // For image-to-image generation
}

// Function to generate image via API (DALL-E or Gemini)
export async function generateImage(prompt: string, engine: ImageEngine = 'dalle', options?: Partial<ImageGenerationOptions>): Promise<string> {
  // Support legacy function signature
  if (typeof engine === 'object') {
    options = engine;
    engine = 'dalle';
  }

  const fullOptions: ImageGenerationOptions = {
    prompt,
    engine,
    ...options
  };

  return generateImageWithOptions(fullOptions);
}

// New function with full options support
export async function generateImageWithOptions(options: ImageGenerationOptions): Promise<string> {
    const { prompt, engine = 'dalle', geminiModel, imageInput } = options;

    console.log(`DEBUG: Generating image with engine: ${engine}, prompt: ${prompt}`);

    if (engine === 'gemini') {
      return generateImageWithGemini({
        prompt,
        model: geminiModel,
        imageInput
      });
    }

    // Default to DALL-E
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
    } catch (error: any) {
        // Extract detailed error information from OpenAI API response
        let errorDetails = 'Unknown error occurred';

        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            if (data && typeof data === 'object') {
                // Extract OpenAI-specific error details
                if (data.error && data.error.message) {
                    errorDetails = `${status}: ${data.error.message}`;
                    if (data.error.type) {
                        errorDetails += ` (Type: ${data.error.type})`;
                    }
                } else if (data.message) {
                    errorDetails = `${status}: ${data.message}`;
                } else {
                    errorDetails = `${status}: ${JSON.stringify(data)}`;
                }
            } else {
                errorDetails = `${status}: ${String(data)}`;
            }
        } else if (error.message) {
            errorDetails = error.message;
        }

        console.error('OpenAI API Error Details:', errorDetails);
        throw new Error(`Failed to generate image: ${errorDetails}`);
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
    } catch (error: any) {
        // Extract detailed error information from OpenAI API response
        let errorDetails = 'Unknown error occurred';

        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            if (data && typeof data === 'object') {
                // Extract OpenAI-specific error details
                if (data.error && data.error.message) {
                    errorDetails = `${status}: ${data.error.message}`;
                    if (data.error.type) {
                        errorDetails += ` (Type: ${data.error.type})`;
                    }
                } else if (data.message) {
                    errorDetails = `${status}: ${data.message}`;
                } else {
                    errorDetails = `${status}: ${JSON.stringify(data)}`;
                }
            } else {
                errorDetails = `${status}: ${String(data)}`;
            }
        } else if (error.message) {
            errorDetails = error.message;
        }

        if (DEBUG) console.error('DEBUG: OpenAI Vision API Error Details:', errorDetails);
        throw new Error(`Failed to describe image: ${errorDetails}`);
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
export async function generateWelcomeImage(prompt: string, engine: ImageEngine = 'dalle', options?: Partial<ImageGenerationOptions>): Promise<string> {
    const imageResult = await generateImage(prompt, engine, options);

    // Check if result is a URL (DALL-E) or file path (Gemini)
    let imagePath: string;

    if (imageResult.startsWith('http')) {
      // DALL-E returns URL, download it
      imagePath = path.join(tempDir, `welcome_image_${Date.now()}.png`);
      await downloadAndSaveImage(imageResult, imagePath);
    } else {
      // Gemini returns file path directly
      imagePath = imageResult;
    }

    const watermarkedImagePath = WATERMARK_PATH ? await addWatermark(imagePath, WATERMARK_PATH) : imagePath;

    return watermarkedImagePath;
}
