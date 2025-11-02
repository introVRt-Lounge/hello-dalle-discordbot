#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Import compiled services
const { generateProfilePicture } = require('./dist/services/pfpService');
const { getDEFAULT_ENGINE } = require('./dist/config');

async function generatePFPTransformations() {
    console.log('🚀 Generating PFP Transformations...');

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // Mock Discord.js objects
    const mockChannel = {
        send: () => Promise.resolve(null),
        isTextBased: () => true
    };

    const mockGuild = {
        id: 'test-guild',
        channels: {
            cache: {
                get: () => mockChannel
            }
        }
    };

    // Test scenarios for PFP transformations
    const pfpScenarios = [
        {
            username: 'heavygee',
            pfpFile: 'pfp6.png',
            theme: 'space explorer',
            displayName: 'heavygee'
        },
        {
            username: 'radgey',
            pfpFile: 'pfp5.png',
            theme: 'medieval knight',
            displayName: 'radgey'
        },
        {
            username: 'wallac3',
            pfpFile: 'pfp4.png',
            theme: 'superhero',
            displayName: 'wallac3'
        }
    ];

    for (const scenario of pfpScenarios) {
        console.log(`\n🎨 Processing ${scenario.username} → ${scenario.theme}`);

        // Mock member with avatar pointing to local file
        const mockMember = {
            id: `user-${scenario.username}`,
            user: {
                id: `user-${scenario.username}`,
                username: scenario.username,
                displayName: scenario.displayName,
                displayAvatarURL: () => `file://${path.join(__dirname, 'docs/assets', scenario.pfpFile)}`,
                createdAt: new Date('2020-01-01T00:00:00.000Z')
            },
            guild: mockGuild,
            joinedAt: new Date('2020-01-01T00:00:00.000Z'),
            roles: {
                cache: {
                    has: () => false
                }
            },
            permissions: {
                has: () => false
            }
        };

        // Generate for both engines
        for (const engine of ['dalle', 'gemini']) {
            try {
                console.log(`   📸 Generating ${engine.toUpperCase()} version...`);

                const result = await generateProfilePicture(
                    { user: { id: 'test-user' } }, // mock client
                    mockMember,
                    false, // genderSensitive
                    scenario.theme, // overridePrompt
                    false, // isPrivate
                    engine,
                    true // useExistingPfp
                );

                // Copy result to docs/assets with descriptive name
                if (result && typeof result === 'string') {
                    const filename = `pfp-${scenario.username}-${scenario.theme.replace(' ', '-')}-${engine}.png`;
                    const targetPath = path.join(__dirname, 'docs/assets', filename);

                    if (fs.existsSync(result)) {
                        fs.copyFileSync(result, targetPath);
                        console.log(`   ✅ Saved: ${filename}`);

                        // Clean up temp file
                        fs.unlinkSync(result);
                    }
                }

            } catch (error) {
                console.error(`   ❌ Failed ${engine.toUpperCase()}: ${error.message}`);
            }
        }
    }

    console.log('\n🎉 PFP Transformation Generation Complete!');
    console.log('📁 Check docs/assets/ for the generated images');
}

if (require.main === module) {
    generatePFPTransformations().catch(console.error);
}

module.exports = { generatePFPTransformations };