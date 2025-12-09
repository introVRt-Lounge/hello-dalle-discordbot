import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import axios from 'axios';
import { GEMINI_API_KEY, DEBUG } from '../config';
import * as fs from 'fs';
import * as path from 'path';

// Types for Gemini models
export type GeminiImageModelType = 'gemini-2.5-flash-image' | 'imagen-3.0'; // For image generation only
export type GeminiMultimodalModelType = 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'gemini-2.5-pro'; // For text + image analysis

export interface GeminiImageOptions {
  model?: GeminiImageModelType;
  imageInput?: string; // Path to input image for image-to-image
  prompt: string;
  useAnalysis?: boolean; // Whether to use multimodal analysis for better prompts (default: true)
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

// Get the appropriate Gemini image generation model
function getGeminiImageModel(modelType: GeminiImageModelType = 'gemini-2.5-flash-image'): GenerativeModel {
  const client = getGeminiClient();

  switch (modelType) {
    case 'gemini-2.5-flash-image':
      return client.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
    case 'imagen-3.0':
      return client.getGenerativeModel({ model: 'imagen-3.0' });
    default:
      return client.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
  }
}

// Get the appropriate Gemini multimodal model (for text + image analysis)
function getGeminiMultimodalModel(modelType: GeminiMultimodalModelType = 'gemini-2.5-flash'): GenerativeModel {
  const client = getGeminiClient();

  switch (modelType) {
    case 'gemini-2.0-flash':
      return client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    case 'gemini-2.5-pro':
      return client.getGenerativeModel({ model: 'gemini-2.5-pro' });
    default:
      return client.getGenerativeModel({ model: 'gemini-2.0-flash' });
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

// Analyze image content using multimodal Gemini model
export async function analyzeImageContent(imagePath: string): Promise<string> {
  try {
    const modelInstance = getGeminiMultimodalModel('gemini-2.5-flash'); // Use multimodal model for image analysis // Use text model for analysis

    if (DEBUG) {
      console.log(`DEBUG: Analyzing image content: ${imagePath}`);
    }

    const base64Image = imageToBase64(imagePath);
    const mimeType = getMimeType(imagePath);

    const analysisPrompt = "Describe the primary subject of this image, its pose, and its background in 15 words or less. If it is a person, identify key features like hair color, expression, clothing. If it is an object, identify its type and material. Be concise and specific.";

    const content = [
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      },
      {
        text: analysisPrompt
      }
    ] as any;

    const result = await modelInstance.generateContent(content);
    const response = result.response;

    // Extract the text description
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            if (DEBUG) {
              console.log(`DEBUG: Image analysis result: ${part.text}`);
            }
            return part.text.trim();
          }
        }
      }
    }

    throw new Error('No text response received from image analysis');

  } catch (error) {
    console.error('Error analyzing image content:', error);
    // Fallback to generic description
    return 'an image with a primary subject';
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

// For now, let's use inline data approach with proper structure
// TODO: Implement proper File API upload when needed

// Generate image using Gemini with the CORRECT image generation API
export async function generateImageWithGemini(options: GeminiImageOptions): Promise<string> {
  return await generateImageWithGeminiInternal(options);
}

// Internal function that does the actual Gemini API call using REST API for image generation
async function generateImageWithGeminiInternal(options: GeminiImageOptions): Promise<string> {
  const { model = 'gemini-2.5-flash-image', imageInput, prompt, useAnalysis = true } = options;

  // Validate inputs before API key check
  if (imageInput && !fs.existsSync(imageInput)) {
    throw new Error(`Failed to read image file: ${imageInput}`);
  }

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required for Gemini image generation');
  }

  if (DEBUG) {
    console.log(`DEBUG: Generating image with Gemini using multimodal approach`);
    console.log(`DEBUG: Original prompt: ${prompt}`);
    console.log(`DEBUG: Use analysis: ${useAnalysis}`);
    if (imageInput) {
      console.log(`DEBUG: Using input image: ${imageInput}`);
    }
  }

  let finalPrompt = prompt;

  // For image-to-image transformations, use multimodal analysis + image generation
  if (imageInput && fs.existsSync(imageInput) && useAnalysis) {
    try {
      // Step 1: Analyze the image using Gemini's multimodal capabilities
      const imageDescription = await analyzeImageContent(imageInput);

      // Step 2: Create enhanced prompt using the analysis
      finalPrompt = `Create an image based on this subject: ${imageDescription}. ${prompt}. Preserve the subject's key visual characteristics and pose.`;

      if (DEBUG) {
        console.log(`DEBUG: Enhanced multimodal prompt: ${finalPrompt}`);
      }
    } catch (analysisError) {
      // If analysis fails, fall back to basic prompt
      console.warn('Image analysis failed, using basic prompt:', analysisError);
      finalPrompt = prompt;
    }
  }

  try {
    // Use REST API for image generation - this is TEXT-TO-IMAGE only
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateImage?key=${GEMINI_API_KEY}`;

    const response = await axios.post(apiUrl, {
      prompt: finalPrompt
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (DEBUG) {
      console.log('DEBUG: Gemini image generation API response received');
      console.log('DEBUG: Response status:', response.status);
    }

    // Extract image data from the response
    const responseData = response.data;
    if (responseData.generatedImages && responseData.generatedImages.length > 0) {
      const generatedImage = responseData.generatedImages[0];
      const imageData = generatedImage.imageData;
      const mimeType = generatedImage.mimeType || 'image/png';

      if (DEBUG) {
        console.log(`DEBUG: Found generated image, mimeType: ${mimeType}`);
        console.log(`DEBUG: Data length: ${imageData.length}`);
      }

      // Convert base64 to temporary file
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFileName = `gemini-generated-${Date.now()}.png`;
      const tempFilePath = path.join(tempDir, tempFileName);

      try {
        // Decode base64 and save as file
        const imageBuffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(tempFilePath, imageBuffer);

        if (DEBUG) {
          console.log(`DEBUG: Saved Gemini generated image to: ${tempFilePath}`);
          console.log(`DEBUG: File size: ${imageBuffer.length} bytes`);
        }

        return tempFilePath;
      } catch (bufferError) {
        console.error('DEBUG: Error decoding base64 image data:', bufferError);
        throw new Error(`Failed to decode Gemini image data: ${bufferError}`);
      }
    }

    throw new Error('No image data found in Gemini generateImage response');

  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown Gemini API error';

    if (DEBUG) {
      console.error('DEBUG: Gemini image generation error:', error.response?.data || error);
    }

    // Handle specific Gemini API errors
    if (errorMessage.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Try again later or check your billing.');
    } else if (errorMessage.includes('safety') || errorMessage.includes('policy')) {
      throw new Error('Gemini rejected the prompt due to safety filters. Try a different prompt.');
    } else if (errorMessage.includes('model')) {
      throw new Error(`Gemini model error: ${errorMessage}`);
    }

    throw new Error(`Gemini image generation failed: ${errorMessage}`);
  }
}

// Test Gemini connectivity using multimodal model
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const modelInstance = getGeminiMultimodalModel('gemini-2.5-flash'); // Use latest multimodal model
    const result = await modelInstance.generateContent('Say "Gemini connected" in one word');
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
