import { generateImageWithOptions, ImageGenerationOptions, downloadAndSaveImage } from '../utils/imageUtils';
import fs from 'fs';
import path from 'path';

// Integration tests that actually generate images via paid APIs
// These tests require valid API keys and will be skipped in CI unless explicitly enabled
//
// IMPORTANT: All tests that cost money preserve their generated artifacts! for another project!
// Generated images are saved to dated directories: integration-test-outputs/YYYY-MM-DDTHH-MM-SS/
// These directories are gitignored to avoid committing binary files.
describe('Image Generation Integration Tests', () => {
    const testImagePath = path.join(process.cwd(), 'helpers', 'pfp6.png');

    // Create dated output directory for this test run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS format
    const outputDir = path.join(process.cwd(), 'integration-test-outputs', timestamp);

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
                prompt: 'Abstract neon landscape forming from digital mist — silhouettes emerging slowly, illuminated by pulsating light waves. The mood is mysterious and anticipatory, like a world booting up to sound. Stylized digital artwork, club visual art.',
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
                prompt: 'Fluid silhouettes of dancers materializing through fog and strobe light, bodies moving like liquid in rhythm with deep bass. The atmosphere is sensual and immersive, colors shifting between violet, cyan, and magenta. Projection mapping visual, glowing body paint.',
                engine: 'gemini',
                geminiModel: 'gemini-2.0-flash' // Use the same model that works for image-to-image
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

        test('should handle Gemini API errors gracefully', async () => {
            // Test general error handling with a prompt that should generate an image
            const options: ImageGenerationOptions = {
                prompt: 'Explosive visual of bodies dissolving into light shards, merging with digital waveform tunnels. The motion feels ecstatic, transcendental — chaos and unity rendered in vivid pulses of color and glitch. Gaspar Noé style cinematography.',
                engine: 'gemini',
                geminiModel: 'nano-banana'
            };

            try {
                const result = await generateImageWithOptions(options);
                expect(result).toBeDefined();

                // If we got a result, we paid for it - preserve the artifact!
                if (typeof result === 'string' && !result.startsWith('http') && fs.existsSync(result)) {
                    const filename = `gemini-error-test-${Date.now()}.png`;
                    const outputPath = path.join(outputDir, filename);
                    await fs.promises.copyFile(result, outputPath);

                    console.log('✅ Gemini handled request successfully');
                    console.log('📁 Preserved generated image:', path.relative(process.cwd(), outputPath));

                    // Clean up temp file
                    fs.unlinkSync(result);
                } else {
                    console.log('✅ Gemini returned URL or no file generated');
                }
            } catch (error: any) {
                // Should handle any API errors gracefully
                expect(error.message.toLowerCase()).toMatch(/failed|error/i);
                console.log('✅ Gemini handled API error gracefully:', error.message);
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
