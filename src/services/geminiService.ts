import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GEMINI_API_KEY, DEBUG } from '../config';
import * as fs from 'fs';
import * as path from 'path';

// Types for Gemini image generation
export type GeminiModelType = 'gemini-2.0-flash' | 'gemini-2.5-pro';

export interface GeminiImageOptions {
  model?: GeminiModelType;
  imageInput?: string; // Path to input image for image-to-image
  prompt: string;
  useAnalysis?: boolean; // Whether to use two-step analysis for better prompts (default: true)
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
function getGeminiModel(modelType: GeminiModelType = 'gemini-2.0-flash'): GenerativeModel {
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

// Analyze image content using text-based Gemini model
export async function analyzeImageContent(imagePath: string): Promise<string> {
  try {
    const modelInstance = getGeminiModel('gemini-2.0-flash'); // Use text model for analysis

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

// Generate image using Gemini with retry logic for reliability
export async function generateImageWithGemini(options: GeminiImageOptions): Promise<string> {
  const { model = 'gemini-2.0-flash', imageInput, prompt, useAnalysis = true } = options;

  // Retry up to 3 times with modified prompts if Gemini returns text instead of image
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const attemptPrompt = attempt === 1 ? prompt : modifyPromptForRetry(prompt, attempt);
      const result = await generateImageWithGeminiInternal({ ...options, prompt: attemptPrompt });

      if (DEBUG) {
        console.log(`DEBUG: Gemini attempt ${attempt} successful`);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || '';

      // If it's a content policy violation, don't retry - this will fail
      if (errorMessage.includes('safety') || errorMessage.includes('policy') || errorMessage.includes('violating')) {
        if (DEBUG) {
          console.log(`DEBUG: Content policy violation detected, not retrying: ${errorMessage}`);
        }
        throw error;
      }

      // If it's the last attempt, throw the error
      if (attempt === 3) {
        if (DEBUG) {
          console.log(`DEBUG: All ${attempt} Gemini attempts failed`);
        }
        throw error;
      }

      // For other errors (including text responses), try again with modified prompt
      if (DEBUG) {
        console.log(`DEBUG: Gemini attempt ${attempt} failed (${errorMessage}), retrying with modified prompt`);
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Unexpected error in Gemini retry logic');
}

// Helper function to modify prompts for retry attempts
function modifyPromptForRetry(originalPrompt: string, attempt: number): string {
  const forceImageInstructions = "CRITICAL: You MUST generate and return an actual IMAGE file. Do not return text, descriptions, or explanations. Only return the visual image.";

  switch (attempt) {
    case 2:
      return `${forceImageInstructions} Generate a cyberpunk billboard image showing: ${originalPrompt}. Return ONLY the image, no text.`;
    case 3:
      return `${forceImageInstructions} Create a synthwave/cyberpunk welcome image for username display: ${originalPrompt}. Return ONLY the visual image file.`;
    default:
      return originalPrompt;
  }
}

// Internal function that does the actual Gemini API call
async function generateImageWithGeminiInternal(options: GeminiImageOptions): Promise<string> {
  const { model = 'gemini-2.0-flash', imageInput, prompt, useAnalysis = true } = options;

  // Validate inputs before API key check
  if (imageInput && !fs.existsSync(imageInput)) {
    throw new Error(`Failed to read image file: ${imageInput}`);
  }

  const modelInstance = getGeminiModel(model);

  if (DEBUG) {
    console.log(`DEBUG: Generating image with Gemini model: ${model}`);
    console.log(`DEBUG: Original prompt: ${prompt}`);
    console.log(`DEBUG: Use analysis: ${useAnalysis}`);
    if (imageInput) {
      console.log(`DEBUG: Using input image: ${imageInput}`);
    }
  }

  let finalPrompt = prompt;
  let content: any[];

  if (imageInput && fs.existsSync(imageInput)) {
    // Image-to-image generation: Use two-step analysis if enabled
    const base64Image = imageToBase64(imageInput);
    const mimeType = getMimeType(imageInput);

    if (useAnalysis) {
      // Step 1: Analyze the image content first
      const imageDescription = await analyzeImageContent(imageInput);

      // Step 2: Create enhanced prompt using the analysis
      finalPrompt = `IMPORTANT: Generate an actual IMAGE file, not text. Using the input image, and knowing that the subject is: "${imageDescription}", ${prompt}. Preserve the subject's form, pose, and key visual characteristics while applying the requested transformation. Return ONLY the image.`;

      if (DEBUG) {
        console.log(`DEBUG: Enhanced prompt: ${finalPrompt}`);
      }
    }

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
    // Text-to-image generation
    finalPrompt = `IMPORTANT: Generate an actual IMAGE file, not text or descriptions. ${prompt}. Return ONLY the visual image.`;
    content = [{ text: finalPrompt }];
  }

  const result = await modelInstance.generateContent(content);

  if (DEBUG) {
    console.log('DEBUG: Gemini response received');
    console.log('DEBUG: Full response:', JSON.stringify(result.response, null, 2));
    console.log('DEBUG: Candidates:', result.response.candidates);
    if (result.response.candidates && result.response.candidates[0]) {
      console.log('DEBUG: First candidate parts:', result.response.candidates[0].content?.parts);
    }
  }

  // Extract the generated image URL/data from response
  // Gemini returns image data differently than DALL-E
  const response = result.response;

  if (DEBUG) {
    console.log('DEBUG: Processing Gemini response...');
    console.log('DEBUG: Response structure keys:', Object.keys(response));
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      console.log('DEBUG: Candidate structure:', Object.keys(candidate));
      if (candidate.content && candidate.content.parts) {
        candidate.content.parts.forEach((part: any, index: number) => {
          console.log(`DEBUG: Part ${index} keys:`, Object.keys(part));
          if (part.inlineData || part.inline_data) {
            console.log(`DEBUG: Part ${index} inline data keys:`, Object.keys(part.inlineData || part.inline_data));
          }
        });
      }
    }
  }

  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];

    // Check if response contains image data
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        // Check for inline data (image response)
        const inlineData = part.inlineData;
        if (inlineData && inlineData.data) {
          // Gemini returned image data directly
          const imageData = inlineData.data;
          const mimeType = inlineData.mimeType || 'image/png';

          if (DEBUG) {
            console.log(`DEBUG: Found inline data, mimeType: ${mimeType}`);
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

            return tempFilePath; // Return file path instead of URL
          } catch (bufferError) {
            console.error('DEBUG: Error decoding base64 image data:', bufferError);
            throw new Error(`Failed to decode Gemini image data: ${bufferError}`);
          }
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
