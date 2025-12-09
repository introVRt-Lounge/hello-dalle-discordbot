import { DEBUG, OPENAI_API_KEY, WATERMARK_PATH, ImageEngine, getDEFAULT_ENGINE } from '../config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import sharp = require('sharp');
import { generateImageWithGemini, GeminiImageModelType } from '../services/geminiService';

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

export interface ImageGenerationOptions {
  prompt: string;
  engine?: ImageEngine;
  geminiModel?: GeminiImageModelType;
  imageInput?: string; // For image-to-image generation
  useAnalysis?: boolean; // Whether to use double-LLM analysis for better prompts (default: true)
}

// Function to generate image via API (DALL-E or Gemini)
export async function generateImage(prompt: string, engine: ImageEngine = getDEFAULT_ENGINE(), options?: Partial<ImageGenerationOptions>): Promise<string> {
  // Support legacy function signature
  if (typeof engine === 'object') {
    options = engine;
    engine = getDEFAULT_ENGINE();
  }

  const fullOptions: ImageGenerationOptions = {
    prompt,
    engine,
    ...options
  };

  return generateImageWithOptions(fullOptions);
}

// Sanitize prompt to avoid content policy violations
function sanitizePrompt(prompt: string): string {
    // Remove or replace potentially problematic words/phrases
    let sanitized = prompt;

    // Replace potentially suggestive terms with safer alternatives
    sanitized = sanitized.replace(/\bsexy\b/gi, 'attractive');
    sanitized = sanitized.replace(/\bhot\b/gi, 'stylish');
    sanitized = sanitized.replace(/\bbeautiful\b/gi, 'elegant');
    sanitized = sanitized.replace(/\bnaked\b|\bnude\b/gi, 'artistically posed');
    sanitized = sanitized.replace(/\bcall_me_sexy\b/gi, 'call_me_cool');

    // Handle specific case of "bare shoulders" before generic "bare" replacement
    if (sanitized.toLowerCase().includes('bare') && sanitized.toLowerCase().includes('shoulder')) {
        sanitized = sanitized.replace(/bare shoulders?/gi, 'stylish outfit');
    }

    // Replace remaining instances of "bare" with safer alternatives
    sanitized = sanitized.replace(/\bbare\b/gi, 'minimalist');

    return sanitized;
}

// New function with full options support
export async function generateImageWithOptions(options: ImageGenerationOptions): Promise<string> {
    const { prompt, engine = 'dalle', geminiModel, imageInput, useAnalysis = true } = options;

    // Sanitize prompt for Gemini to avoid content policy violations
    const sanitizedPrompt = engine === 'gemini' ? sanitizePrompt(prompt) : prompt;

    console.log(`DEBUG: Generating image with engine: ${engine}, original prompt: ${prompt}`);
    if (sanitizedPrompt !== prompt) {
        console.log(`DEBUG: Sanitized prompt: ${sanitizedPrompt}`);
    }

    // Primary engine attempt
    try {
    if (engine === 'gemini') {
        return await generateImageWithGemini({
          prompt: sanitizedPrompt,
        model: geminiModel,
        imageInput,
        useAnalysis
      });
      } else {
    // Default to DALL-E
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required for DALL-E image generation. Please set the OPENAI_API_KEY environment variable.');
    }

        const response = await axios.post('https://api.openai.com/v1/images/generations', {
            model: 'dall-e-3',
            prompt: sanitizedPrompt,
            n: 1,
            size: "1024x1024"
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.data[0].url;
      }
    } catch (primaryError: any) {
      const primaryErrorMessage = primaryError.message || 'Unknown error occurred';

      console.error(`Primary engine (${engine}) failed:`, primaryErrorMessage);

      // Fallback logic: if primary fails, try the other engine
      const fallbackEngine = engine === 'gemini' ? 'dalle' : 'gemini';

      console.log(`Attempting fallback to ${fallbackEngine} engine...`);

      try {
        if (fallbackEngine === 'gemini') {
          // For Gemini fallback, use a more sanitized version to avoid content issues
          const geminiFallbackPrompt = sanitizePrompt(prompt).replace(/call_me_\w+/gi, 'call_me_cool');
          return await generateImageWithGemini({
            prompt: geminiFallbackPrompt,
            model: geminiModel,
            imageInput,
            useAnalysis: false // Disable analysis for fallback to avoid further issues
          });
                } else {
          // Fallback to DALL-E
          if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is required for DALL-E fallback. Please set the OPENAI_API_KEY environment variable.');
          }

          const response = await axios.post('https://api.openai.com/v1/images/generations', {
            model: 'dall-e-3',
            prompt: sanitizedPrompt,
            n: 1,
            size: "1024x1024"
          }, {
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          return response.data.data[0].url;
                }
      } catch (fallbackError: any) {
        const fallbackErrorMessage = fallbackError.message || 'Unknown fallback error';

        console.error(`Fallback engine (${fallbackEngine}) also failed:`, fallbackErrorMessage);

        // Extract detailed error information for both engines
        let primaryDetails = primaryErrorMessage;
        let fallbackDetails = fallbackErrorMessage;

        // For OpenAI/DALL-E errors, extract detailed info
        if (primaryError.response) {
          const status = primaryError.response.status;
          const data = primaryError.response.data;
          if (data?.error?.message) {
            primaryDetails = `${status}: ${data.error.message}`;
        }
        }

        if (fallbackError.response) {
          const status = fallbackError.response.status;
          const data = fallbackError.response.data;
          if (data?.error?.message) {
            fallbackDetails = `${status}: ${data.error.message}`;
          }
        }

        throw new Error(`Image generation failed with both engines. Primary (${engine}): ${primaryDetails}. Fallback (${fallbackEngine}): ${fallbackDetails}`);
      }
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

// Function to add watermark to PFP images with custom positioning (bottom center)
export async function addPfpWatermark(imagePath: string, watermarkPath: string | undefined): Promise<string> {
    try {
        const outputImagePath = path.join(welcomeImagesDir, `pfp_watermarked_${Date.now()}.png`);

        if (!watermarkPath) {
            return imagePath;
        }

        // Get image metadata to calculate positioning
        const imageMetadata = await sharp(imagePath).metadata();
        const imageWidth = imageMetadata.width || 1024;
        const imageHeight = imageMetadata.height || 1024;

        // Position watermark at 90% vertical (10% from bottom), centered horizontally
        const watermarkVerticalPos = Math.floor(imageHeight * 0.9); // 90% down
        const watermark = await sharp(watermarkPath).resize({ width: 200 }).toBuffer();
        const watermarkMetadata = await sharp(watermark).metadata();
        const watermarkWidth = watermarkMetadata.width || 200;
        const watermarkHorizontalPos = Math.floor((imageWidth - watermarkWidth) / 2); // Center horizontally

        await sharp(imagePath)
            .composite([{
                input: watermark,
                left: watermarkHorizontalPos,
                top: watermarkVerticalPos
            }])
            .toFile(outputImagePath);

        return outputImagePath;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to add PFP watermark: ${errorMessage}`);
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
    // Handle file:// URLs by copying directly instead of downloading
    if (url.startsWith('file://')) {
        const sourcePath = url.replace('file://', '');
        await fs.promises.copyFile(sourcePath, filepath);
        return filepath;
    }

    // Handle HTTP/HTTPS URLs
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
export async function generateWelcomeImage(prompt: string, engine: ImageEngine = getDEFAULT_ENGINE(), options?: Partial<ImageGenerationOptions>): Promise<string> {
    const imageResult = await generateImage(prompt, engine, options);

    // Check if result is a URL (DALL-E) or file path (Gemini)
    let imagePath: string;

    if (imageResult.startsWith('http') || imageResult.startsWith('https')) {
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
