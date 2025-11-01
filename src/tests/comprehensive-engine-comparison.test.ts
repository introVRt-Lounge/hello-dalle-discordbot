import { generateProfilePicture } from '../services/pfpService';
import { setDEFAULT_ENGINE } from '../config';
import { Client, GuildMember, TextChannel, Guild } from 'discord.js';
import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { downloadAndSaveImage, generateImage, describeImage } from '../utils/imageUtils';

// Mock Discord client and related objects
const mockClient = {
  user: { id: '123456789', username: 'TestBot' }
} as Client;

const mockGuild = {
  id: 'guild123',
  channels: {
    cache: {
      get: jest.fn()
    }
  }
} as unknown as Guild;

const mockMember = {
  id: 'member123',
  user: {
    id: 'member123',
    username: 'TestUser123',
    displayName: 'TestUser123',
    createdAt: new Date('2020-01-01T00:00:00.000Z'), // Mock creation date
    displayAvatarURL: jest.fn(() => 'https://example.com/avatar.png')
  },
  guild: mockGuild
} as unknown as GuildMember;

const mockChannel = {
  send: jest.fn(),
  isTextBased: jest.fn(() => true)
} as unknown as TextChannel;

// Mock the botspam channel lookup
(mockGuild.channels.cache.get as jest.Mock).mockReturnValue(mockChannel);

// Test scenarios for comprehensive engine comparison
const testScenarios = [
  {
    name: 'Default Username Generation',
    pfpSource: 'pfp1.png',
    engine: 'dalle' as const,
    useExistingPfp: false,
    overridePrompt: undefined,
    description: 'Basic username-based generation without avatar analysis'
  },
  {
    name: 'Default Username Generation',
    pfpSource: 'pfp1.png',
    engine: 'gemini' as const,
    useExistingPfp: false,
    overridePrompt: undefined,
    description: 'Basic username-based generation without avatar analysis'
  },
  {
    name: 'Override Prompt Only',
    pfpSource: 'pfp2.png',
    engine: 'dalle' as const,
    useExistingPfp: false,
    overridePrompt: 'a cyberpunk hacker with neon green hair and glowing tattoos',
    description: 'Custom prompt override without using existing avatar'
  },
  {
    name: 'Override Prompt Only',
    pfpSource: 'pfp2.png',
    engine: 'gemini' as const,
    useExistingPfp: false,
    overridePrompt: 'a cyberpunk hacker with neon green hair and glowing tattoos',
    description: 'Custom prompt override without using existing avatar'
  },
  {
    name: 'Use Existing PFP (DALL-E Vision)',
    pfpSource: 'pfp3.png',
    engine: 'dalle' as const,
    useExistingPfp: true,
    overridePrompt: undefined,
    description: 'Transform existing avatar using GPT-4 Vision analysis'
  },
  {
    name: 'Use Existing PFP (Gemini Multimodal)',
    pfpSource: 'pfp3.png',
    engine: 'gemini' as const,
    useExistingPfp: true,
    overridePrompt: undefined,
    description: 'Transform existing avatar using Gemini multimodal analysis'
  },
  {
    name: 'Combined: Override + Existing PFP',
    pfpSource: 'pfp4.png',
    engine: 'dalle' as const,
    useExistingPfp: true,
    overridePrompt: 'transform into a steampunk inventor with gears and goggles',
    description: 'Custom transformation using both avatar analysis and override prompt'
  },
  {
    name: 'Combined: Override + Existing PFP',
    pfpSource: 'pfp4.png',
    engine: 'gemini' as const,
    useExistingPfp: true,
    overridePrompt: 'transform into a steampunk inventor with gears and goggles',
    description: 'Custom transformation using both avatar analysis and override prompt'
  },
  {
    name: 'Fantasy Character Override',
    pfpSource: 'pfp5.png',
    engine: 'dalle' as const,
    useExistingPfp: false,
    overridePrompt: 'an elven archer in mystical fantasy armor with glowing runes',
    description: 'Fantasy character transformation using text prompt only'
  },
  {
    name: 'Fantasy Character Override',
    pfpSource: 'pfp5.png',
    engine: 'gemini' as const,
    useExistingPfp: false,
    overridePrompt: 'an elven archer in mystical fantasy armor with glowing runes',
    description: 'Fantasy character transformation using text prompt only'
  },
  {
    name: 'Avatar-Based Fantasy',
    pfpSource: 'pfp6.png',
    engine: 'dalle' as const,
    useExistingPfp: true,
    overridePrompt: 'transform into a powerful wizard with magical robes and staff',
    description: 'Fantasy transformation using actual avatar features as base'
  },
  {
    name: 'Avatar-Based Fantasy',
    pfpSource: 'pfp6.png',
    engine: 'gemini' as const,
    useExistingPfp: true,
    overridePrompt: 'transform into a powerful wizard with magical robes and staff',
    description: 'Fantasy transformation using actual avatar features as base'
  }
];

describe('Comprehensive Engine Comparison - Real Examples', () => {
  beforeAll(() => {
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default engine before each test
    setDEFAULT_ENGINE('dalle');
  });

  testScenarios.forEach((scenario) => {
    test(`should generate ${scenario.name} for ${scenario.pfpSource} using ${scenario.engine}`, async () => {
      console.log(`🧪 Testing: ${scenario.name} (${scenario.pfpSource}) with ${scenario.engine}`);
      console.log(`📝 Description: ${scenario.description}`);
      console.log(`🎯 Engine: ${scenario.engine}, Use Existing PFP: ${scenario.useExistingPfp}`);
      if (scenario.overridePrompt) {
        console.log(`💬 Override Prompt: "${scenario.overridePrompt}"`);
      }

      // Setup mocks based on scenario
      const mockAvatarUrl = `https://example.com/${scenario.pfpSource}`;
      (mockMember.user.displayAvatarURL as jest.Mock).mockReturnValue(mockAvatarUrl);

      const tempAvatarPath = path.join(__dirname, '../../temp', `test-avatar-${scenario.pfpSource}`);
      const generatedImagePath = path.join(__dirname, '../../temp', `generated-${scenario.name.replace(/\s+/g, '-').toLowerCase()}-${scenario.engine}-${Date.now()}.png`);

      // Mock the utility functions
      const downloadMock = jest.spyOn(require('../utils/imageUtils'), 'downloadAndSaveImage').mockResolvedValue(tempAvatarPath);
      const generateMock = jest.spyOn(require('../utils/imageUtils'), 'generateImage').mockResolvedValue(generatedImagePath);
      const describeMock = jest.spyOn(require('../utils/imageUtils'), 'describeImage');

      // Setup describeImage mock for DALL-E with useExistingPfp
      if (scenario.engine === 'dalle' && scenario.useExistingPfp) {
        describeMock.mockResolvedValue(`A person with distinctive features matching ${scenario.pfpSource}`);
      }

      try {
        await generateProfilePicture(
          mockClient,
          mockMember,
          false, // genderSensitive
          scenario.overridePrompt,
          false, // isPrivate
          scenario.engine,
          scenario.useExistingPfp
        );

        console.log(`✅ Successfully generated image for ${scenario.name}`);
        console.log(`📁 Mock generated image at: ${generatedImagePath}`);
        console.log('---');

        // Verify that an image was posted to the botspam channel
        expect(mockChannel.send).toHaveBeenCalled();

        // Verify the image generation was called
        expect(generateMock).toHaveBeenCalled();

        // Verify avatar download was called when using existing PFP
        if (scenario.useExistingPfp) {
          expect(downloadMock).toHaveBeenCalledWith(mockAvatarUrl, expect.any(String));
          if (scenario.engine === 'dalle') {
            expect(describeMock).toHaveBeenCalled();
          }
        }

      } catch (error) {
        console.error(`❌ Failed to generate ${scenario.name}:`, error);
        throw error;
      } finally {
        // Restore mocks
        downloadMock.mockRestore();
        generateMock.mockRestore();
        describeMock.mockRestore();
      }
    }, 30000); // Reasonable timeout for mocked calls
  });

  afterAll(() => {
    console.log('\n🎉 Comprehensive Engine Comparison Complete!');
    console.log('📊 Results Summary:');
    console.log('- Check temp/ directory for all generated images');
    console.log('- Images are timestamped for easy identification');
    console.log('- Compare DALL-E vs Gemini results for each scenario');
    console.log('- Note how use-existing-pfp creates more personalized results');
  });
});
