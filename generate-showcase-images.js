#!/usr/bin/env node

const { generateProfilePicture } = require('./src/services/pfpService');
const { setDEFAULT_ENGINE } = require('./src/config');
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

const mockMember = {
  id: 'member123',
  user: {
    id: 'member123',
    username: 'TestUser123',
    displayName: 'TestUser123',
    createdAt: new Date('2020-01-01T00:00:00.000Z'),
    displayAvatarURL: () => `file://${path.join(process.cwd(), 'helpers', 'pfp1.png')}`
  },
  guild: mockGuild
};

const mockChannel = {
  send: () => {},
  isTextBased: () => true
};

async function generateShowcaseImage(scenario) {
  console.log(`🎨 Generating: ${scenario.name}`);

  // Set engine
  setDEFAULT_ENGINE(scenario.engine);

  // Set avatar URL to point to actual file
  const avatarPath = path.join(process.cwd(), 'helpers', scenario.pfpSource);
  mockMember.user.displayAvatarURL = () => `file://${avatarPath}`;

  try {
    const result = await generateProfilePicture(
      mockClient,
      mockMember,
      false, // genderSensitive
      scenario.overridePrompt,
      false, // isPrivate
      scenario.engine,
      scenario.useExistingPfp
    );

    console.log(`✅ Generated: ${scenario.name}`);
    return {
      scenario,
      imagePath: result.imagePath,
      prompt: result.prompt
    };
  } catch (error) {
    console.error(`❌ Failed: ${scenario.name}`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Showcase Image Generation...\n');

  const showcaseScenarios = [
    {
      name: 'Default Generation - DALL-E',
      pfpSource: 'pfp1.png',
      engine: 'dalle',
      useExistingPfp: false,
      overridePrompt: undefined
    },
    {
      name: 'Default Generation - Gemini',
      pfpSource: 'pfp1.png',
      engine: 'gemini',
      useExistingPfp: false,
      overridePrompt: undefined
    },
    {
      name: 'Custom Prompt - DALL-E',
      pfpSource: 'pfp2.png',
      engine: 'dalle',
      useExistingPfp: false,
      overridePrompt: 'a cyberpunk hacker with neon green hair and glowing tattoos'
    },
    {
      name: 'Custom Prompt - Gemini',
      pfpSource: 'pfp2.png',
      engine: 'gemini',
      useExistingPfp: false,
      overridePrompt: 'a cyberpunk hacker with neon green hair and glowing tattoos'
    },
    {
      name: 'Use Existing PFP - DALL-E Vision',
      pfpSource: 'pfp3.png',
      engine: 'dalle',
      useExistingPfp: true,
      overridePrompt: undefined
    },
    {
      name: 'Use Existing PFP - Gemini Multimodal',
      pfpSource: 'pfp3.png',
      engine: 'gemini',
      useExistingPfp: true,
      overridePrompt: undefined
    }
  ];

  const results = [];

  for (const scenario of showcaseScenarios) {
    const result = await generateShowcaseImage(scenario);
    if (result) {
      results.push({
        scenario,
        imagePath: result.imagePath,
        prompt: result.prompt
      });
    }
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n📊 Generation Complete!');
  console.log('\n🎯 Results:');

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.scenario.name}`);
    console.log(`   Image: ${result.imagePath}`);
    console.log(`   Prompt: ${result.prompt}`);
    console.log('');
  });

  // Generate markdown for documentation
  const markdown = generateShowcaseMarkdown(results);
  await fs.writeFile('SHOWCASE-IMAGES.md', markdown);

  console.log('📝 Generated SHOWCASE-IMAGES.md with embedded images');
}

function generateShowcaseMarkdown(results) {
  let markdown = '# 🎨 **Image Generation Showcase: DALL-E vs Gemini**\n\n> **SHOW, DON\'T TELL** - Actual generated images demonstrating the differences between engines\n\n## 📊 **Side-by-Side Comparisons**\n\n';

  // Group by scenario type
  const grouped = {};
  results.forEach(result => {
    const baseName = result.scenario.name.replace(' - DALL-E', '').replace(' - Gemini', '');
    if (!grouped[baseName]) grouped[baseName] = {};
    if (result.scenario.name.includes('DALL-E')) {
      grouped[baseName].dalle = result;
    } else {
      grouped[baseName].gemini = result;
    }
  });

  Object.entries(grouped).forEach(([scenario, engines]) => {
    markdown += '### 🎯 **' + scenario + '**\n\n';

    if (engines.dalle) {
      markdown += '**DALL-E Result:**\n';
      markdown += '![DALL-E ' + scenario + '](' + engines.dalle.imagePath + ')\n\n';
      markdown += '*Prompt: "' + engines.dalle.prompt + '"*\n\n';
    }

    if (engines.gemini) {
      markdown += '**Gemini Result:**\n';
      markdown += '![Gemini ' + scenario + '](' + engines.gemini.imagePath + ')\n\n';
      markdown += '*Prompt: "' + engines.gemini.prompt + '"*\n\n';
    }

    markdown += '---\n\n';
  });

  markdown += '## 🔍 **Key Differences Observed**\n\n';
  markdown += '- **Default Generation**: Both engines produce similar generic results from username only\n';
  markdown += '- **Custom Prompts**: Both engines interpret creative prompts similarly, but may vary in style\n';
  markdown += '- **Use Existing PFP**:\n';
  markdown += '  - DALL-E analyzes avatar with GPT-4 Vision and incorporates features into text prompt\n';
  markdown += '  - Gemini uses multimodal analysis for more direct avatar-to-image transformation\n\n';
  markdown += '## 📁 **Source Images Used**\n\n';

  ['pfp1.png', 'pfp2.png', 'pfp3.png'].forEach(pfp => {
    markdown += '### ' + pfp + '\n';
    markdown += '![' + pfp + '](helpers/' + pfp + ')\n\n';
  });

  markdown += '\n---\n\n*Generated on: ' + new Date().toISOString() + '*';

  return markdown;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateShowcaseImage };
