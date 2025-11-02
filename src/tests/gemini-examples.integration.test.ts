import { generateImageWithGemini, analyzeImageContent } from '../services/geminiService';
import { generateImageWithOptions, ImageGenerationOptions } from '../utils/imageUtils';
import fs from 'fs';
import path from 'path';

describe('Gemini Image Generation Examples', () => {
    const helpersDir = path.join(__dirname, '../../helpers');

    // Temporarily disable cleanup for demonstration
    const CLEANUP_IMAGES = false;

    const testImages = [
        'pfp1.png',
        'pfp2.png',
        'pfp3.png',
        'pfp4.png',
        'pfp5.png'
    ];

    // User-like override prompts that simulate real Discord usage
    const userOverridePrompts = [
        'Make me look like a cyberpunk hacker with neon green hair',
        'Turn me into a fantasy elf with glowing magical runes',
        'Give me steampunk goggles and a leather trench coat',
        'Make me a space explorer with a futuristic helmet',
        'Transform me into a medieval knight with armor and sword',
        'Give me vampire fangs and pale skin with dark makeup',
        'Make me look like a superhero with a cape and mask',
        'Turn me into a pirate with an eyepatch and parrot',
        'Give me wizard robes and a magical staff',
        'Make me look like a rockstar with wild hair and leather jacket'
    ];

    // Welcome image prompts for testing cyberpunk billboard approach
    const welcomePrompts = [
        'Create a cyberpunk billboard welcome poster featuring this person as the main star',
        'Design a futuristic city billboard announcing the arrival of this person',
        'Make a neon-lit welcome sign in a cyberpunk alley featuring this person',
        'Create a holographic welcome display in a high-tech city with this person as the focus'
    ];

    describe('Profile Picture Transformations', () => {
        test.each(testImages)('should analyze and transform %s with various user prompts', async (imageName) => {
            const imagePath = path.join(helpersDir, imageName);

            // First, analyze the image to see what we're working with
            console.log(`\n🔍 Analyzing ${imageName}...`);
            const analysis = await analyzeImageContent(imagePath);
            console.log(`📝 Analysis: "${analysis}"`);

            // Test a few different transformation prompts
            const testPrompts = userOverridePrompts.slice(0, 3); // Test first 3 prompts

            for (const prompt of testPrompts) {
                console.log(`\n🎨 Testing prompt: "${prompt}"`);

                const options: ImageGenerationOptions = {
                    prompt,
                    engine: 'gemini',
                    imageInput: imagePath,
                    geminiModel: 'nano-banana'
                };

                const result = await generateImageWithOptions(options);
                console.log(`✅ Generated: ${result}`);

                // Verify the file was created and is valid
                expect(fs.existsSync(result)).toBe(true);
                const stats = fs.statSync(result);
                expect(stats.size).toBeGreaterThan(10000); // Should be a substantial image

                if (CLEANUP_IMAGES) {
                    fs.unlinkSync(result);
                }
            }
        }, 120000); // 2 minute timeout per image
    });

    describe('Welcome Image Generation', () => {
        test.each(testImages.slice(0, 3))('should create welcome images for %s using cyberpunk theme', async (imageName) => {
            const imagePath = path.join(helpersDir, imageName);

            // Analyze the image first
            console.log(`\n🔍 Analyzing ${imageName} for welcome image...`);
            const analysis = await analyzeImageContent(imagePath);
            console.log(`📝 Analysis: "${analysis}"`);

            for (const welcomePrompt of welcomePrompts) {
                console.log(`\n🏙️ Creating welcome image with prompt: "${welcomePrompt}"`);

                const options: ImageGenerationOptions = {
                    prompt: welcomePrompt,
                    engine: 'gemini',
                    imageInput: imagePath,
                    geminiModel: 'nano-banana'
                };

                const result = await generateImageWithOptions(options);
                console.log(`✅ Welcome image generated: ${result}`);

                // Verify the file was created and is valid
                expect(fs.existsSync(result)).toBe(true);
                const stats = fs.statSync(result);
                expect(stats.size).toBeGreaterThan(10000);

                if (CLEANUP_IMAGES) {
                    fs.unlinkSync(result);
                }
            }
        }, 120000); // 2 minute timeout per image
    });

    describe('Direct Gemini Service Testing', () => {
        test('should demonstrate the double-LLM workflow step by step', async () => {
            const testImage = path.join(helpersDir, 'pfp3.png');

            console.log('\n🔬 Demonstrating Double-LLM Workflow:');

            // Step 1: Analysis
            console.log('Step 1: Image Analysis');
            const analysis = await analyzeImageContent(testImage);
            console.log(`📝 Raw Analysis: "${analysis}"`);

            // Step 2: Enhanced Generation
            console.log('\nStep 2: Enhanced Image Generation');
            const userPrompt = 'Transform this person into a cyberpunk street artist with glowing tattoos';
            console.log(`🎨 User Prompt: "${userPrompt}"`);

            const enhancedPrompt = `Using the input image, and knowing that the subject is: "${analysis}", ${userPrompt}. Preserve the subject's form, pose, and key visual characteristics while applying the requested transformation.`;

            console.log(`🔧 Enhanced System Prompt: "${enhancedPrompt}"`);

            const options: ImageGenerationOptions = {
                prompt: userPrompt, // Original user prompt - the system will enhance it internally
                engine: 'gemini',
                imageInput: testImage,
                geminiModel: 'nano-banana'
            };

            const result = await generateImageWithOptions(options);
            console.log(`✅ Final Result: ${result}`);

            expect(fs.existsSync(result)).toBe(true);
            const stats = fs.statSync(result);
            expect(stats.size).toBeGreaterThan(10000);

            if (CLEANUP_IMAGES) {
                fs.unlinkSync(result);
            }
        }, 60000);
    });

    describe('Default Welcome Prompt Testing', () => {
        test('should test the actual WELCOME_PROMPT from config with double-LLM', async () => {
            const testImage = path.join(helpersDir, 'pfp1.png');
            const username = 'TestUser123';

            // The actual WELCOME_PROMPT from config
            const defaultWelcomePrompt = "Create a welcome image for a new Discord user with the username '{username}' proclaimed on a large cyberpunk style billboard, the entire image being a mixture of synthwave and cyberpunk styles. Incorporate users avatar into the image, {avatar}";

            // Replace placeholders like the bot does
            const processedPrompt = defaultWelcomePrompt.replace('{username}', username);

            console.log('\n🏙️ Testing Default Welcome Prompt:');
            console.log(`📝 Original prompt: ${defaultWelcomePrompt}`);
            console.log(`🔧 Processed prompt: ${processedPrompt}`);

            const options: ImageGenerationOptions = {
                prompt: processedPrompt,
                engine: 'gemini',
                imageInput: testImage,
                geminiModel: 'nano-banana',
                useAnalysis: true // Use double-LLM analysis
            };

            const result = await generateImageWithOptions(options);
            console.log(`✅ Generated welcome image: ${result}`);

            expect(fs.existsSync(result)).toBe(true);
            const stats = fs.statSync(result);
            expect(stats.size).toBeGreaterThan(10000);

            if (CLEANUP_IMAGES) {
                fs.unlinkSync(result);
            }
        }, 60000);
    });

    describe('Performance Analysis', () => {
        test('should compare analysis vs direct generation performance', async () => {
            const testImage = path.join(helpersDir, 'pfp2.png');
            const prompt = 'Make this person look like a futuristic robot';

            console.log('\n⚡ Performance Comparison:');

            // Test with analysis (double-LLM)
            console.log('Testing with analysis enabled...');
            const startWithAnalysis = Date.now();

            const optionsWithAnalysis: ImageGenerationOptions = {
                prompt,
                engine: 'gemini',
                imageInput: testImage,
                geminiModel: 'nano-banana',
                useAnalysis: true
            };

            const resultWithAnalysis = await generateImageWithOptions(optionsWithAnalysis);
            const timeWithAnalysis = Date.now() - startWithAnalysis;

            console.log(`⏱️ With analysis: ${timeWithAnalysis}ms`);

            // Test without analysis (direct)
            console.log('Testing with analysis disabled...');
            const startWithoutAnalysis = Date.now();

            const optionsWithoutAnalysis: ImageGenerationOptions = {
                prompt,
                engine: 'gemini',
                imageInput: testImage,
                geminiModel: 'nano-banana',
                useAnalysis: false
            };

            const resultWithoutAnalysis = await generateImageWithOptions(optionsWithoutAnalysis);
            const timeWithoutAnalysis = Date.now() - startWithoutAnalysis;

            console.log(`⏱️ Without analysis: ${timeWithoutAnalysis}ms`);

            // Both should produce valid images
            expect(fs.existsSync(resultWithAnalysis)).toBe(true);
            expect(fs.existsSync(resultWithoutAnalysis)).toBe(true);

            const statsWith = fs.statSync(resultWithAnalysis);
            const statsWithout = fs.statSync(resultWithoutAnalysis);

            console.log(`📊 Quality comparison:`);
            console.log(`  With analysis: ${statsWith.size} bytes`);
            console.log(`  Without analysis: ${statsWithout.size} bytes`);

            expect(statsWith.size).toBeGreaterThan(10000);
            expect(statsWithout.size).toBeGreaterThan(10000);

            if (CLEANUP_IMAGES) {
                fs.unlinkSync(resultWithAnalysis);
                fs.unlinkSync(resultWithoutAnalysis);
            }
        }, 120000);
    });
});
