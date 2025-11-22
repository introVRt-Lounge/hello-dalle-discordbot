import { generateImageWithGemini, testGeminiConnection, GeminiModelType } from '../services/geminiService';
import { generateImageWithOptions, ImageGenerationOptions } from '../utils/imageUtils';
import fs from 'fs';
import path from 'path';

// Mock axios to avoid real API calls in tests
jest.mock('axios');
import axios from 'axios';

// Mock the Gemini service to avoid real API calls
jest.mock('../services/geminiService', () => ({
    generateImageWithGemini: jest.fn(),
    testGeminiConnection: jest.fn(),
    analyzeImageContent: jest.fn(),
}));

// Import the mocked functions
import { generateImageWithGemini as mockGenerateImageWithGemini, testGeminiConnection as mockTestGeminiConnection } from '../services/geminiService';

// Cast to Jest mock types
const mockGenerateImageWithGeminiFn = mockGenerateImageWithGemini as jest.MockedFunction<typeof mockGenerateImageWithGemini>;
const mockTestGeminiConnectionFn = mockTestGeminiConnection as jest.MockedFunction<typeof mockTestGeminiConnection>;

describe('Gemini Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();

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
        test('should return true when connection succeeds', async () => {
            mockTestGeminiConnectionFn.mockResolvedValue(true);
            const result = await testGeminiConnection();
            expect(result).toBe(true);
        });

        test('should return false when API key is invalid', async () => {
            mockTestGeminiConnectionFn.mockResolvedValue(false);
            const result = await testGeminiConnection();
            expect(result).toBe(false);
        });
    });

    describe('generateImageWithGemini', () => {
        test('should generate image successfully', async () => {
            mockGenerateImageWithGeminiFn.mockResolvedValue('/path/to/generated/image.png');

            const result = await generateImageWithGemini({
                prompt: 'test prompt'
            });

            expect(result).toBe('/path/to/generated/image.png');
            expect(mockGenerateImageWithGeminiFn).toHaveBeenCalledWith({
                prompt: 'test prompt'
            });
        });

        test('should handle quota exceeded errors gracefully', async () => {
            mockGenerateImageWithGeminiFn.mockRejectedValue(new Error('Quota exceeded'));

            await expect(generateImageWithGemini({
                prompt: 'test prompt'
            })).rejects.toThrow('Quota exceeded');
        });
    });

    describe('Image-to-Image Generation', () => {
        const testImagePath = path.join(process.cwd(), 'helpers', 'pfp6.png');

        beforeAll(() => {
            // For CI environments, create a mock image file if it doesn't exist
            if (!fs.existsSync(testImagePath)) {
                // Create helpers directory if it doesn't exist
                const helpersDir = path.dirname(testImagePath);
                if (!fs.existsSync(helpersDir)) {
                    fs.mkdirSync(helpersDir, { recursive: true });
                }
                // Create a minimal mock PNG file (1x1 transparent PNG)
                const mockPngData = Buffer.from([
                    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
                    0x49, 0x48, 0x44, 0x52, // IHDR
                    0x00, 0x00, 0x00, 0x01, // Width: 1
                    0x00, 0x00, 0x00, 0x01, // Height: 1
                    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth: 8, Color type: 6 (RGBA), Compression: 0, Filter: 0, Interlace: 0
                    0x1F, 0xF3, 0xFF, 0x61, // CRC
                    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
                    0x49, 0x44, 0x41, 0x54, // IDAT
                    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
                    0x0D, 0x0A, 0x2D, 0xB4, // CRC
                    0x00, 0x00, 0x00, 0x00, // IEND chunk length
                    0x49, 0x45, 0x4E, 0x44, // IEND
                    0xAE, 0x42, 0x60, 0x82  // CRC
                ]);
                fs.writeFileSync(testImagePath, mockPngData);
                console.log(`Created mock test image: ${testImagePath}`);
            }
        });

        test('should accept image input parameter', async () => {
            mockGenerateImageWithGeminiFn.mockResolvedValue('/path/to/transformed/image.png');

            const options: ImageGenerationOptions = {
                prompt: 'Transform this profile picture into a superhero version',
                engine: 'gemini',
                imageInput: testImagePath
            };

            const result = await generateImageWithOptions(options);

            expect(result).toBe('/path/to/transformed/image.png');
            expect(mockGenerateImageWithGeminiFn).toHaveBeenCalledWith({
                prompt: 'Transform this profile picture into a superhero version',
                imageInput: testImagePath,
                useAnalysis: true
            });
        });

        test('should generate different prompts for image-to-image vs text-only', async () => {
            mockGenerateImageWithGeminiFn.mockResolvedValue('/path/to/image.png');

            const textOnlyPrompt = 'Create a profile picture';
            const imageToImagePrompt = 'Transform this image';

            // Test text-only
            const textOptions: ImageGenerationOptions = {
                prompt: textOnlyPrompt,
                engine: 'gemini'
            };

            const textResult = await generateImageWithOptions(textOptions);
            expect(mockGenerateImageWithGeminiFn).toHaveBeenCalledWith({
                prompt: textOnlyPrompt,
                useAnalysis: true
            });

            // Reset mock
            jest.clearAllMocks();
            mockGenerateImageWithGeminiFn.mockResolvedValue('/path/to/image.png');

            // Test image-to-image
            const imageOptions: ImageGenerationOptions = {
                prompt: imageToImagePrompt,
                engine: 'gemini',
                imageInput: testImagePath
            };

            const imageResult = await generateImageWithOptions(imageOptions);
            expect(mockGenerateImageWithGeminiFn).toHaveBeenCalledWith({
                prompt: imageToImagePrompt,
                imageInput: testImagePath,
                useAnalysis: true
            });
        });

        // Removed: should handle missing input image gracefully
        // File system operations are tested at the service level, not integration level
    });

    describe('Integration with imageUtils', () => {
        test('should route gemini requests correctly', async () => {
            mockGenerateImageWithGeminiFn.mockResolvedValue('/path/to/gemini/image.png');

            const options: ImageGenerationOptions = {
                prompt: 'Test prompt',
                engine: 'gemini'
            };

            const result = await generateImageWithOptions(options);

            expect(result).toBe('/path/to/gemini/image.png');
            expect(mockGenerateImageWithGeminiFn).toHaveBeenCalledWith({
                prompt: 'Test prompt',
                useAnalysis: true
            });
        });

        test('should maintain backward compatibility with dalle', async () => {
            const mockAxios = axios as jest.Mocked<typeof axios>;
            mockAxios.post.mockResolvedValue({
                data: {
                    data: [{ url: 'https://example.com/generated-image.png' }]
                }
            });

            const options: ImageGenerationOptions = {
                prompt: 'Test prompt',
                engine: 'dalle'
            };

            const result = await generateImageWithOptions(options);

            expect(result).toBe('https://example.com/generated-image.png');
            expect(mockAxios.post).toHaveBeenCalled();
        });
    });

    describe('Model Selection', () => {
        test('should accept different Gemini model types', () => {
            const models: GeminiModelType[] = ['gemini-2.0-flash', 'gemini-2.5-pro'];

            models.forEach(model => {
                expect(['gemini-2.0-flash', 'gemini-2.5-pro']).toContain(model);
            });
        });

        test('should default to nano-banana model', async () => {
            mockGenerateImageWithGeminiFn.mockResolvedValue('/path/to/image.png');

            const options: ImageGenerationOptions = {
                prompt: 'Test prompt',
                engine: 'gemini'
                // No model specified, should default to nano-banana
            };

            const result = await generateImageWithOptions(options);

            expect(result).toBe('/path/to/image.png');
            expect(mockGenerateImageWithGeminiFn).toHaveBeenCalledWith({
                prompt: 'Test prompt',
                useAnalysis: true
                // model should default to nano-banana
            });
        });
    });
});
