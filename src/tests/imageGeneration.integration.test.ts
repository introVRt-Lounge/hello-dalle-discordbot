import { generateImageWithOptions, ImageGenerationOptions, downloadAndSaveImage } from '../utils/imageUtils';
import fs from 'fs';
import path from 'path';

// Integration tests that actually generate images via paid APIs
// These tests require valid API keys and will be skipped in CI unless explicitly enabled
//
// IMPORTANT: All tests that cost money preserve their generated artifacts!
// Generated images are saved to dated directories: integration-test-outputs/YYYY-MM-DDTHH-MM-SS/
// These directories are gitignored to avoid committing binary files.
describe('Image Generation Integration Tests', () => {
    const testImagePath = path.join(process.cwd(), 'helpers', 'pfp6.png');

    // Create dated output directory for this test run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS format
    const outputDir = path.join(process.cwd(), 'integration-test-outputs', timestamp);

    beforeAll(() => {
        // Ensure test image exists
        if (!fs.existsSync(testImagePath)) {
            throw new Error(`Test image not found: ${testImagePath}`);
        }

        // Ensure dated output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`📁 Created integration test output directory: ${outputDir}`);
        }
    });

    // Skip these tests unless explicitly enabled AND API keys are available (require real API keys)
    const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true' &&
                               !!process.env.OPENAI_API_KEY &&
                               !!process.env.GEMINI_API_KEY;

    (runIntegrationTests ? describe : describe.skip)('Real Image Generation', () => {
        test('should generate image with DALL-E', async () => {
            const options: ImageGenerationOptions = {
                prompt: 'A simple test image of a blue circle',
                engine: 'dalle'
            };

            const imageUrl = await generateImageWithOptions(options);

            // Should return a URL for DALL-E
            expect(typeof imageUrl).toBe('string');
            expect(imageUrl.startsWith('http')).toBe(true);

            // Download and save the image to dated output directory
            const filename = `dalle-blue-circle-${Date.now()}.png`;
            const outputPath = path.join(outputDir, filename);
            await downloadAndSaveImage(imageUrl, outputPath);

            // Verify the downloaded file exists
            expect(fs.existsSync(outputPath)).toBe(true);
            const stats = fs.statSync(outputPath);
            expect(stats.size).toBeGreaterThan(1000); // At least 1KB

            console.log('✅ DALL-E generated image URL:', imageUrl);
            console.log('📁 Preserved in output directory:', path.relative(process.cwd(), outputPath));
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

            // Copy to dated output directory for preservation
            const filename = `gemini-text-to-image-${Date.now()}.png`;
            const outputPath = path.join(outputDir, filename);
            await fs.promises.copyFile(result, outputPath);

            console.log('✅ Gemini generated image file:', result);
            console.log('📁 Preserved in output directory:', path.relative(process.cwd(), outputPath));

            // Clean up temp file
            if (fs.existsSync(result)) {
                fs.unlinkSync(result);
            }
        }, 60000); // 60 second timeout for Gemini

        test('should generate image-to-image with Gemini using pfp6.png', async () => {
            const options: ImageGenerationOptions = {
                prompt: 'Take this exact profile picture and create a cartoon superhero version while maintaining the person\'s facial features, expression, and overall appearance. Add a superhero cape flowing behind them and keep the original art style but make it more animated.',
                engine: 'gemini',
                imageInput: testImagePath,
                geminiModel: 'nano-banana'
            };

            const result = await generateImageWithOptions(options);

            // Should return a file path for Gemini
            expect(typeof result).toBe('string');
            expect(result.startsWith('http')).toBe(false);
            expect(fs.existsSync(result)).toBe(true);

            // Copy to dated output directory for preservation
            const filename = `gemini-image-to-image-superhero-${Date.now()}.png`;
            const outputPath = path.join(outputDir, filename);
            await fs.promises.copyFile(result, outputPath);

            console.log('✅ Gemini image-to-image generated file:', result);
            console.log('📁 Preserved in output directory:', path.relative(process.cwd(), outputPath));

            // Verify the file is a valid image by checking file size
            const stats = fs.statSync(result);
            expect(stats.size).toBeGreaterThan(1000); // At least 1KB

            // Clean up temp file
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

                // If we got a result, we paid for it - preserve the artifact!
                if (typeof result === 'string' && !result.startsWith('http') && fs.existsSync(result)) {
                    const filename = `gemini-quota-test-${Date.now()}.png`;
                    const outputPath = path.join(outputDir, filename);
                    await fs.promises.copyFile(result, outputPath);

                    console.log('✅ Gemini handled request without quota issues');
                    console.log('📁 Preserved generated image:', path.relative(process.cwd(), outputPath));

                    // Clean up temp file
                    fs.unlinkSync(result);
                } else {
                    console.log('✅ Gemini returned URL or no file generated');
                }
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
        // Integration test outputs are preserved in dated directories for inspection
        // Files are stored in: integration-test-outputs/YYYY-MM-DDTHH-MM-SS/
        // These directories are gitignored to avoid committing generated images
        console.log(`📁 Integration test outputs preserved in: ${path.relative(process.cwd(), outputDir)}`);
    });
});
