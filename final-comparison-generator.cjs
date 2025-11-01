#!/usr/bin/env node

const { generateProfilePicture } = require('./dist/services/pfpService');
const { generateWelcomeImage } = require('./dist/utils/imageUtils');
const { describeImage } = require('./dist/utils/imageUtils');
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

// Real Discord users and their PFPs with expected descriptions
const users = [
  {
    pfp: 'pfp1.png',
    username: 'Ariabel',
    displayName: 'Ariabel',
    expectedDesc: 'mystical woman with elegant features, long dark hair, ethereal presence'
  },
  {
    pfp: 'pfp2.png',
    username: 'pecachu',
    displayName: 'pecachu',
    expectedDesc: 'playful animated character with large expressive eyes, curious expression'
  },
  {
    pfp: 'pfp3.png',
    username: 'tokentrevor',
    displayName: 'tokentrevor',
    expectedDesc: 'determined professional with sharp features, thoughtful expression'
  },
  {
    pfp: 'pfp4.png',
    username: 'Wallac3',
    displayName: 'Wallac3',
    expectedDesc: 'confident adventurer with strong features, determined look'
  },
  {
    pfp: 'pfp5.png',
    username: 'Radgey',
    displayName: 'Radgey',
    expectedDesc: 'creative artist with distinctive features, imaginative presence'
  },
  {
    pfp: 'pfp6.png',
    username: 'heavygee',
    displayName: 'heavygee',
    expectedDesc: 'scholarly intellectual with glasses, thoughtful demeanor'
  }
];

// Scenarios to generate with proper avatar analysis
const scenarios = [
  // Ariabel welcome (DALL-E) - should use avatar description
  {
    id: 1,
    type: 'welcome',
    user: users[0],
    engine: 'dalle',
    theme: 'default'
  },
  // Ariabel welcome (Gemini) - uses avatar directly
  {
    id: 1,
    type: 'welcome',
    user: users[0],
    engine: 'gemini',
    theme: 'default'
  },
  // tokentrevor welcome (DALL-E) - should use avatar description
  {
    id: 4,
    type: 'welcome',
    user: users[2],
    engine: 'dalle',
    theme: 'steampunk'
  },
  // tokentrevor welcome (Gemini) - uses avatar directly
  {
    id: 4,
    type: 'welcome',
    user: users[2],
    engine: 'gemini',
    theme: 'steampunk'
  },
  // pecachu welcome (DALL-E) - should use avatar description
  {
    id: 6,
    type: 'welcome',
    user: users[1],
    engine: 'dalle',
    theme: 'default'
  },
  // pecachu welcome (Gemini) - uses avatar directly
  {
    id: 6,
    type: 'welcome',
    user: users[1],
    engine: 'gemini',
    theme: 'default'
  }
];

async function analyzeAvatar(avatarPath) {
  try {
    console.log(`🔍 Analyzing avatar: ${avatarPath}`);
    const description = await describeImage(avatarPath);
    console.log(`📝 Avatar analysis: "${description}"`);
    return description;
  } catch (error) {
    console.error(`❌ Failed to analyze avatar:`, error.message);
    return 'avatar analysis failed';
  }
}

async function generateComparisonImage(scenario) {
  console.log(`\n🎨 Generating scenario ${scenario.id} for ${scenario.user.displayName} using ${scenario.engine} (${scenario.type}: ${scenario.theme})`);

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
    let actualPrompt;
    let avatarDescription = null;

    if (scenario.type === 'welcome') {
      if (scenario.engine === 'dalle') {
        // DALL-E: Analyze avatar first, then enhance prompt
        console.log(`🤖 DALL-E: Analyzing avatar for enhanced prompt...`);
        avatarDescription = await analyzeAvatar(avatarPath);

        let basePrompt;
        if (scenario.theme === 'steampunk') {
          basePrompt = `Create a welcome image for ${scenario.user.displayName} proclaimed upon and incorporated into a steampunk city billboard in Victorian-era mechanical styles.`;
        } else {
          basePrompt = `Create a welcome image for ${scenario.user.displayName} proclaimed upon and incorporated into a cyberpunk billboard in a mixture of synthwave and cyberpunk styles.`;
        }

        const enhancedPrompt = `${basePrompt} Incorporate visual elements from this avatar description: "${avatarDescription}".`;
        actualPrompt = enhancedPrompt;
        console.log(`📝 DALL-E Prompt: "${enhancedPrompt}"`);

        result = await generateWelcomeImage(enhancedPrompt, 'dalle', { imageInput: avatarPath });

      } else if (scenario.engine === 'gemini') {
        // Gemini: Analyze avatar, then use in double-LLM prompt
        console.log(`🤖 Gemini: Analyzing avatar for double-LLM prompt...`);
        avatarDescription = await analyzeAvatar(avatarPath);

        let basePrompt;
        if (scenario.theme === 'steampunk') {
          basePrompt = `Create a welcome image for ${scenario.user.displayName} proclaimed upon and incorporated into a steampunk city billboard in Victorian-era mechanical styles.`;
        } else {
          basePrompt = `Create a welcome image for ${scenario.user.displayName} proclaimed upon and incorporated into a cyberpunk billboard in a mixture of synthwave and cyberpunk styles.`;
        }

        const geminiPrompt = `Using the input image as reference: ${avatarDescription}. ${basePrompt}`;
        actualPrompt = geminiPrompt;
        console.log(`📝 Gemini Prompt: "${geminiPrompt}"`);

        result = await generateWelcomeImage(geminiPrompt, 'gemini', { imageInput: avatarPath });
      }
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
        imagePath: destPath,
        prompt: actualPrompt,
        avatarDescription
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
  console.log('🚀 Generating final comparison images with proper avatar analysis...\n');

  // Ensure docs/assets exists
  await fs.mkdir(path.join(process.cwd(), 'docs', 'assets'), { recursive: true });

  const results = [];

  for (const scenario of scenarios) {
    const result = await generateComparisonImage(scenario);
    if (result) {
      results.push(result);
    }
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n📊 Generation Complete!');
  console.log(`Generated ${results.length} images successfully`);

  // Show detailed prompt breakdown for documentation
  console.log('\n🔍 PROMPT BREAKDOWN FOR DOCUMENTATION:');
  results.forEach(r => {
    console.log(`\n--- ${r.scenario.user.displayName} ${r.scenario.engine.toUpperCase()} ---`);
    console.log(`Avatar Analysis: "${r.avatarDescription}"`);
    console.log(`Full Prompt: "${r.prompt}"`);

    if (r.scenario.engine === 'dalle') {
      console.log(`Static Part: "${r.prompt.split('Incorporate visual elements from this avatar description:')[0].trim()}"`);
      console.log(`Dynamic Part: "Incorporate visual elements from this avatar description: \\"${r.avatarDescription}\\"."`);
    } else if (r.scenario.engine === 'gemini') {
      console.log(`Dynamic Part: "Using the input image as reference: ${r.avatarDescription}."`);
      console.log(`Static Part: "${r.prompt.split('. ')[1]}"`);
    }
  });
}

if (require.main === module) {
  main().catch(console.error);
}
