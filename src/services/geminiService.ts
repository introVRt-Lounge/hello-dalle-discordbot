import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from '@google/generative-ai';
import axios from 'axios';
import { GEMINI_API_KEY, DEBUG, GEMINI_IMAGE_MAX_ATTEMPTS } from '../config';
import * as fs from 'fs';
import * as path from 'path';

// Types for Gemini models
export type GeminiImageModelType = 'gemini-2.5-flash-image' | 'gemini-1.5-flash'; // For image generation via REST API
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
    case 'gemini-1.5-flash':
      return client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    default:
      return client.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
  }
}

// Get the appropriate Gemini multimodal model (for text + image analysis)
function getGeminiMultimodalModel(modelType: GeminiMultimodalModelType = 'gemini-2.5-flash'): GenerativeModel {
  const client = getGeminiClient();

  switch (modelType) {
    case 'gemini-2.5-flash':
      return client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    case 'gemini-2.0-flash':
      return client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    case 'gemini-2.5-pro':
      return client.getGenerativeModel({ model: 'gemini-2.5-pro' });
    default:
      return client.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
    const modelInstance = getGeminiMultimodalModel('gemini-2.5-flash'); // Use multimodal model for image analysis

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeGeminiParts(parts: Array<{ inlineData?: { data?: string }; text?: string }>): string {
  return parts
    .map((part) => {
      if (part.inlineData?.data) {
        return 'IMAGE';
      }
      if (part.text !== undefined) {
        return `TEXT(${part.text.length}ch)`;
      }
      return 'UNKNOWN';
    })
    .join(',');
}

/** Returns a temp file path when inline image data is present; null when the model returned no image. */
function extractImageFromGeminiResponse(result: GenerateContentResult): string | null {
  if (!result.response.candidates || result.response.candidates.length === 0) {
    return null;
  }

  const candidate = result.response.candidates[0];
  if (!candidate.content?.parts) {
    return null;
  }

  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      const imageData = part.inlineData.data;
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `gemini-generated-${Date.now()}.png`);
      const imageBuffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync(tempFilePath, imageBuffer);

      if (DEBUG) {
        console.log(`DEBUG: Saved Gemini generated image to: ${tempFilePath}`);
        console.log(`DEBUG: File size: ${imageBuffer.length} bytes`);
      }

      return tempFilePath;
    }

    if (part.text && DEBUG) {
      console.log('DEBUG: Text part in response:', part.text.substring(0, 200) + '...');
    }
  }

  return null;
}

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

  // For image-to-image transformations
  if (imageInput && fs.existsSync(imageInput)) {
    if (useAnalysis) {
      // Use multimodal analysis + image generation
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
    } else {
      // Skip analysis but still include image in generation request
      // The image will be processed by Gemini's image generation model directly
      if (DEBUG) {
        console.log(`DEBUG: Using image input without analysis for direct image-to-image generation`);
      }
    }
  }

  try {
    // Use SDK for image generation (this is the WORKING approach!)
    const client = getGeminiClient();
    const modelInstance = client.getGenerativeModel({ model: model });

    // Prepare content for generation
    let content: any;
    if (imageInput && fs.existsSync(imageInput)) {
      // Image-to-image generation: include both image and prompt
      const base64Image = imageToBase64(imageInput);
      const mimeType = getMimeType(imageInput);

      content = [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        {
          text: finalPrompt
        }
      ] as any;
    } else {
      // Text-to-image generation: prompt only
      content = finalPrompt;
    }

    for (let attempt = 1; attempt <= GEMINI_IMAGE_MAX_ATTEMPTS; attempt++) {
      if (DEBUG) {
        console.log(`DEBUG: Calling model.generateContent() with SDK (attempt ${attempt}/${GEMINI_IMAGE_MAX_ATTEMPTS})...`);
      }

      const result = await modelInstance.generateContent(content);

      if (DEBUG) {
        console.log('DEBUG: Gemini SDK response received');
        console.log('DEBUG: Candidates:', result.response.candidates?.length || 0);
      }

      const savedPath = extractImageFromGeminiResponse(result);
      if (savedPath) {
        if (attempt > 1) {
          console.log(`Gemini image generation succeeded on attempt ${attempt}/${GEMINI_IMAGE_MAX_ATTEMPTS}`);
        }
        return savedPath;
      }

      const candidate = result.response.candidates?.[0];
      const partsSummary = summarizeGeminiParts(candidate?.content?.parts || []);
      console.warn(
        `Gemini returned no image data (attempt ${attempt}/${GEMINI_IMAGE_MAX_ATTEMPTS}) ` +
        `finishReason=${candidate?.finishReason ?? 'none'} parts=[${partsSummary}]`
      );

      if (attempt < GEMINI_IMAGE_MAX_ATTEMPTS) {
        await sleep(400 * attempt);
      }
    }

    throw new Error('No image data found in Gemini SDK response');

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
