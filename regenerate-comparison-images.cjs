#!/usr/bin/env node

const { generateProfilePicture } = require('./dist/services/pfpService');
const { generateWelcomeImage } = require('./dist/utils/imageUtils');
const { promises: fs } = require('fs');
const path = require('path');

// Mock Discord client and related objects
const mockClient = {
  user: { id: '123456789', username: 'TestBot' }
};

const mockGuild = {
  id: 'guild123',
  channels: {
    cache: {
      get: () => mockChannel
    }
  }
};

const mockChannel = {
  send: () => {},
  isTextBased: () => true
};

// Real Discord users and their PFPs
const users = [
  { pfp: 'pfp1.png', username: 'Ariabel', displayName: 'Ariabel' },
  { pfp: 'pfp2.png', username: 'pecachu', displayName: 'pecachu' },
  { pfp: 'pfp3.png', username: 'tokentrevor', displayName: 'tokentrevor' }
];

// Scenarios that worked before
const scenarios = [
  // Ariabel welcome (DALL-E)
  {
    id: 1,
    type: 'welcome',
    user: users[0],
    engine: 'dalle',
    theme: 'default'
  },
  // Ariabel welcome (Gemini)
  {
    id: 1,
    type: 'welcome',
    user: users[0],
    engine: 'gemini',
    theme: 'default'
  },
  // tokentrevor welcome (DALL-E)
  {
    id: 4,
    type: 'welcome',
    user: users[2],
    engine: 'dalle',
    theme: 'steampunk'
  },
  // tokentrevor welcome (Gemini)
  {
    id: 4,
    type: 'welcome',
    user: users[2],
    engine: 'gemini',
    theme: 'steampunk'
  },
  // pecachu welcome (DALL-E)
  {
    id: 6,
    type: 'welcome',
    user: users[1],
    engine: 'dalle',
    theme: 'default'
  },
  // pecachu welcome (Gemini)
  {
    id: 6,
    type: 'welcome',
    user: users[1],
    engine: 'gemini',
    theme: 'default'
  }
];

async function generateComparisonImage(scenario) {
  console.log(`🎨 Regenerating scenario ${scenario.id} for ${scenario.user.displayName} using ${scenario.engine} (${scenario.type}: ${scenario.theme})`);

  // Set avatar URL to point to actual PFP file
  const avatarPath = path.join(process.cwd(), 'helpers', scenario.user.pfp);

  // Create member with correct username
  const mockMember = {
    id: 'member123',
    user: {
      id: 'member123',
      username: scenario.user.username,
      displayName: scenario.user.displayName,
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      displayAvatarURL: () => `file://${avatarPath}`
    },
    guild: mockGuild
  };

  try {
    let result;

    if (scenario.type === 'welcome') {
      // Welcome image generation
      let basePrompt;
      if (scenario.theme === 'steampunk') {
        basePrompt = `Create a welcome image for ${scenario.user.displayName} proclaimed upon and incorporated into a steampunk city billboard in Victorian-era mechanical styles.`;
      } else {
        basePrompt = `Create a welcome image for ${scenario.user.displayName} proclaimed upon and incorporated into a cyberpunk billboard in a mixture of synthwave and cyberpunk styles.`;
      }

      result = await generateWelcomeImage(basePrompt, scenario.engine, {
        imageInput: avatarPath // This provides the avatar for Gemini
      });
    }

    if (result) {
      // Copy to docs/assets with proper naming
      const filename = `comparison-${scenario.id}-${scenario.user.username.toLowerCase()}-${scenario.type}-${scenario.theme.replace(/\s+/g, '-')}-${scenario.engine}.png`;
      const destPath = path.join(process.cwd(), 'docs', 'assets', filename);

      await fs.copyFile(result, destPath);
      console.log(`✅ Saved: docs/assets/${filename}`);

      return {
        scenario,
        filename,
        imagePath: destPath
      };
    } else {
      console.log(`❌ No result for scenario ${scenario.id}`);
      return null;
    }

  } catch (error) {
    console.error(`❌ Failed scenario ${scenario.id} for ${scenario.user.displayName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Regenerating comparison images that worked before...\n');

  // Ensure docs/assets exists
  await fs.mkdir(path.join(process.cwd(), 'docs', 'assets'), { recursive: true });

  const results = [];

  for (const scenario of scenarios) {
    const result = await generateComparisonImage(scenario);
    if (result) {
      results.push(result);
    }
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n📊 Regeneration Complete!');
  console.log(`Generated ${results.length} images successfully`);

  // Update documentation with actual image links
  console.log('\n🔄 Now update IMAGE-GENERATION-FLOWS.md with these image links:');
  results.forEach(r => {
    const url = `https://raw.githubusercontent.com/introVRt-Lounge/hello-dalle-discordbot/feature/gemini-image-generation/docs/assets/${r.filename}`;
    console.log(`${r.scenario.user.displayName} ${r.scenario.engine}: ${url}`);
  });
}

if (require.main === module) {
  main().catch(console.error);
}
