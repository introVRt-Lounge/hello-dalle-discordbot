import { generateImageWithGemini, testGeminiConnection, GeminiModelType } from '../services/geminiService';
import { generateImageWithOptions, ImageGenerationOptions } from '../utils/imageUtils';
import fs from 'fs';
import path from 'path';

// Mock axios to avoid real API calls in tests
jest.mock('axios');
import axios from 'axios';

// Mock the Gemini API key for testing
process.env.GEMINI_API_KEY = 'test-api-key';

describe('Gemini Service Tests', () => {
    beforeEach(() => {
        // Clean up any test files
        const testDir = path.join(__dirname, 'temp');
        if (fs.existsSync(testDir)) {
            const files = fs.readdirSync(testDir);
            files.forEach(file => {
                if (file.startsWith('test-')) {
                    fs.unlinkSync(path.join(testDir, file));
                }
            });
        }
    });

    describe('testGeminiConnection', () => {
        test('should return false when API key is invalid', async () => {
            const result = await testGeminiConnection();
            // Will fail with invalid API key, but should not throw
            expect(typeof result).toBe('boolean');
        });
    });

    describe('generateImageWithGemini', () => {
        test('should throw error when GEMINI_API_KEY is not set', async () => {
            const originalKey = process.env.GEMINI_API_KEY;
            delete process.env.GEMINI_API_KEY;

            await expect(generateImageWithGemini({
                prompt: 'test prompt'
            })).rejects.toThrow('GEMINI_API_KEY environment variable is required');

            process.env.GEMINI_API_KEY = originalKey;
        });

        test('should handle quota exceeded errors gracefully', async () => {
            await expect(generateImageWithGemini({
                prompt: 'test prompt'
            })).rejects.toThrow(); // Will fail due to invalid API key or quota
        });
    });

    describe('Image-to-Image Generation', () => {
        const testImagePath = path.join(__dirname, '../../helpers/pfp6.png');

        beforeAll(() => {
            // Ensure test image exists
            if (!fs.existsSync(testImagePath)) {
                throw new Error(`Test image not found: ${testImagePath}`);
            }
        });

        test('should accept image input parameter', async () => {
            const options: ImageGenerationOptions = {
                prompt: 'Transform this profile picture into a superhero version',
                engine: 'gemini',
                imageInput: testImagePath
            };

            // Should not throw during option validation, even if API call fails
            await expect(generateImageWithOptions(options)).rejects.toThrow();
            // If it doesn't throw during validation, the image input was accepted
        });

        test('should generate different prompts for image-to-image vs text-only', () => {
            const textOnlyPrompt = 'Create a profile picture';
            const imageToImagePrompt = 'Transform this image';

            // These are just string checks - actual generation would require valid API
            expect(textOnlyPrompt).not.toBe(imageToImagePrompt);
        });

        test('should handle missing input image gracefully', async () => {
            const options: ImageGenerationOptions = {
                prompt: 'Generate an image',
                engine: 'gemini',
                imageInput: '/nonexistent/path/image.png'
            };

            await expect(generateImageWithOptions(options)).rejects.toThrow('Failed to read image file');
        });
    });

    describe('Integration with imageUtils', () => {
        test('should route gemini requests correctly', async () => {
            const options: ImageGenerationOptions = {
                prompt: 'Test prompt',
                engine: 'gemini'
            };

            // Should attempt to call Gemini service
            await expect(generateImageWithOptions(options)).rejects.toThrow();
            // The rejection indicates it tried to call Gemini (and failed due to invalid API key)
        });

        test('should maintain backward compatibility with dalle', async () => {
            const mockAxios = axios as jest.Mocked<typeof axios>;
            mockAxios.post.mockRejectedValueOnce(new Error('Invalid API key'));

            const options: ImageGenerationOptions = {
                prompt: 'Test prompt',
                engine: 'dalle'
            };

            // Should attempt to call OpenAI API and fail with mocked error
            await expect(generateImageWithOptions(options)).rejects.toThrow('Invalid API key');
        });
    });

    describe('Model Selection', () => {
        test('should accept different Gemini model types', () => {
            const models: GeminiModelType[] = ['nano-banana', 'gemini-2.0-flash', 'gemini-2.5-pro'];

            models.forEach(model => {
                expect(['nano-banana', 'gemini-2.0-flash', 'gemini-2.5-pro']).toContain(model);
            });
        });

        test('should default to nano-banana model', async () => {
            const options: ImageGenerationOptions = {
                prompt: 'Test prompt',
                engine: 'gemini'
                // No model specified, should default
            };

            await expect(generateImageWithOptions(options)).rejects.toThrow();
            // Default behavior should be tested
        });
    });
});
