import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GEMINI_API_KEY, DEBUG } from '../config';
import fs from 'fs';
import path from 'path';

// Types for Gemini image generation
export type GeminiModelType = 'nano-banana' | 'gemini-2.0-flash' | 'gemini-2.5-pro';

export interface GeminiImageOptions {
  model?: GeminiModelType;
  imageInput?: string; // Path to input image for image-to-image
  prompt: string;
}

// Initialize Gemini AI client
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required for Gemini image generation');
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

// Get the appropriate Gemini model
function getGeminiModel(modelType: GeminiModelType = 'nano-banana'): GenerativeModel {
  const client = getGeminiClient();

  switch (modelType) {
    case 'nano-banana':
      return client.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
    case 'gemini-2.0-flash':
      return client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    case 'gemini-2.5-pro':
      return client.getGenerativeModel({ model: 'gemini-2.5-pro' });
    default:
      return client.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
  }
}

// Convert image file to base64 for Gemini API
function imageToBase64(imagePath: string): string {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to read image file: ${imagePath}`);
  }
}

// Get MIME type from file extension
function getMimeType(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/png'; // Default fallback
  }
}

// Generate image using Gemini
export async function generateImageWithGemini(options: GeminiImageOptions): Promise<string> {
  const { model = 'nano-banana', imageInput, prompt } = options;

  // Validate inputs before API key check
  if (imageInput && !fs.existsSync(imageInput)) {
    throw new Error(`Failed to read image file: ${imageInput}`);
  }

  try {
    const modelInstance = getGeminiModel(model);

    if (DEBUG) {
      console.log(`DEBUG: Generating image with Gemini model: ${model}`);
      console.log(`DEBUG: Prompt: ${prompt}`);
      if (imageInput) {
        console.log(`DEBUG: Using input image: ${imageInput}`);
      }
    }

    let content: any[];

    if (imageInput && fs.existsSync(imageInput)) {
      // Image-to-image generation
      const base64Image = imageToBase64(imageInput);
      const mimeType = getMimeType(imageInput);

      content = [
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        }
      ];
    } else {
      // Text-to-image generation
      content = [prompt];
    }

    const result = await modelInstance.generateContent(content);

    if (DEBUG) {
      console.log('DEBUG: Gemini response received');
    }

    // Extract the generated image URL/data from response
    // Gemini returns image data differently than DALL-E
    const response = result.response;

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];

      // Check if response contains image data
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            // Gemini returned image data directly
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';

            // Convert base64 to temporary file
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFileName = `gemini-generated-${Date.now()}.png`;
            const tempFilePath = path.join(tempDir, tempFileName);

            // Decode base64 and save as file
            const imageBuffer = Buffer.from(imageData, 'base64');
            fs.writeFileSync(tempFilePath, imageBuffer);

            if (DEBUG) {
              console.log(`DEBUG: Saved Gemini generated image to: ${tempFilePath}`);
            }

            return tempFilePath; // Return file path instead of URL
          }
        }
      }
    }

    // If no image data found in response, check for text response (error case)
    const textResponse = response.text();
    if (textResponse) {
      if (DEBUG) {
        console.log('DEBUG: Gemini returned text response:', textResponse);
      }

      // Some Gemini models might return a description instead of image data
      // In this case, we should probably fall back to text-to-image or throw an error
      throw new Error(`Gemini returned text response instead of image: ${textResponse}`);
    }

    throw new Error('No image data found in Gemini response');

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown Gemini API error';

    if (DEBUG) {
      console.error('DEBUG: Gemini image generation error:', error);
    }

    // Handle specific Gemini API errors
    if (errorMessage.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Try again later or check your billing.');
    } else if (errorMessage.includes('safety')) {
      throw new Error('Gemini rejected the prompt due to safety filters. Try a different prompt.');
    } else if (errorMessage.includes('model')) {
      throw new Error(`Gemini model error: ${errorMessage}`);
    }

    throw new Error(`Gemini image generation failed: ${errorMessage}`);
  }
}

// Test Gemini connectivity
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent('Say "Gemini connected" in one word');
    const response = result.response.text().toLowerCase();

    if (DEBUG) {
      console.log('DEBUG: Gemini connection test response:', response);
    }

    return response.includes('gemini') || response.includes('connected');
  } catch (error) {
    if (DEBUG) {
      console.error('DEBUG: Gemini connection test failed:', error);
    }
    return false;
  }
}
