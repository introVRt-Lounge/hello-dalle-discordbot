import { generateImageWithOptions, ImageGenerationOptions } from '../utils/imageUtils';
import fs from 'fs';
import path from 'path';

// Integration tests that actually generate images
// These tests require valid API keys and will be skipped in CI unless explicitly enabled
describe('Image Generation Integration Tests', () => {
    const testImagePath = path.join(__dirname, '../../helpers/pfp6.png');
    const outputDir = path.join(__dirname, 'temp');

    beforeAll(() => {
        // Ensure test image exists
        if (!fs.existsSync(testImagePath)) {
            throw new Error(`Test image not found: ${testImagePath}`);
        }

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    });

    // Skip these tests unless explicitly enabled (require real API keys)
    const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

    (runIntegrationTests ? describe : describe.skip)('Real Image Generation', () => {
        test('should generate image with DALL-E', async () => {
            const options: ImageGenerationOptions = {
                prompt: 'A simple test image of a blue circle',
                engine: 'dalle'
            };

            const result = await generateImageWithOptions(options);

            // Should return a URL for DALL-E
            expect(typeof result).toBe('string');
            expect(result.startsWith('http')).toBe(true);

            console.log('✅ DALL-E generated image URL:', result);
        }, 30000); // 30 second timeout

        test('should generate image with Gemini text-to-image', async () => {
            const options: ImageGenerationOptions = {
                prompt: 'A simple test image of a red square',
                engine: 'gemini',
                geminiModel: 'gemini-2.0-flash' // Use a model more likely to work
            };

            const result = await generateImageWithOptions(options);

            // Should return a file path for Gemini
            expect(typeof result).toBe('string');
            expect(result.startsWith('http')).toBe(false);
            expect(fs.existsSync(result)).toBe(true);

            console.log('✅ Gemini generated image file:', result);

            // Clean up
            if (fs.existsSync(result)) {
                fs.unlinkSync(result);
            }
        }, 60000); // 60 second timeout for Gemini

        test('should generate image-to-image with Gemini using pfp6.png', async () => {
            const options: ImageGenerationOptions = {
                prompt: 'Transform this profile picture into a cartoon version with a superhero cape',
                engine: 'gemini',
                imageInput: testImagePath,
                geminiModel: 'gemini-2.0-flash'
            };

            const result = await generateImageWithOptions(options);

            // Should return a file path for Gemini
            expect(typeof result).toBe('string');
            expect(result.startsWith('http')).toBe(false);
            expect(fs.existsSync(result)).toBe(true);

            console.log('✅ Gemini image-to-image generated file:', result);

            // Verify the file is a valid image by checking file size
            const stats = fs.statSync(result);
            expect(stats.size).toBeGreaterThan(1000); // At least 1KB

            // Clean up
            if (fs.existsSync(result)) {
                fs.unlinkSync(result);
            }
        }, 60000); // 60 second timeout

        test('should handle Gemini quota exceeded gracefully', async () => {
            // This test might hit quota limits, should handle gracefully
            const options: ImageGenerationOptions = {
                prompt: 'A test image that might hit quota limits',
                engine: 'gemini'
            };

            try {
                const result = await generateImageWithOptions(options);
                expect(result).toBeDefined();
                console.log('✅ Gemini handled request without quota issues');
            } catch (error: any) {
                // Should handle quota errors gracefully
                expect(error.message.toLowerCase()).toMatch(/quota|rate limit|exceeded/i);
                console.log('✅ Gemini handled quota exceeded gracefully:', error.message);
            }
        }, 30000);
    });

    describe('Test Image Validation', () => {
        test('should validate pfp6.png test image exists and is readable', () => {
            expect(fs.existsSync(testImagePath)).toBe(true);

            const stats = fs.statSync(testImagePath);
            expect(stats.size).toBeGreaterThan(0);

            // Should be able to read the file
            const buffer = fs.readFileSync(testImagePath);
            expect(buffer.length).toBeGreaterThan(0);
        });

        test('should identify image MIME type correctly', () => {
            const ext = path.extname(testImagePath).toLowerCase();
            expect(['.png', '.jpg', '.jpeg', '.gif', '.webp']).toContain(ext);
        });
    });

    afterAll(() => {
        // Clean up any remaining test files
        if (fs.existsSync(outputDir)) {
            const files = fs.readdirSync(outputDir);
            files.forEach(file => {
                if (file.startsWith('test-') || file.includes('gemini-generated')) {
                    fs.unlinkSync(path.join(outputDir, file));
                }
            });
        }
    });
});
