import * as fs from 'fs';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent
        })
    }))
}));

jest.mock('../config', () => ({
    GEMINI_API_KEY: 'test-gemini-key',
    DEBUG: false,
    GEMINI_IMAGE_MAX_ATTEMPTS: 3
}));

import { generateImageWithGemini } from '../services/geminiService';

describe('Gemini image generation retries', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('retries when the first response has no image data', async () => {
        const pngBytes = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        ]);

        mockGenerateContent
            .mockResolvedValueOnce({
                response: {
                    candidates: [{
                        finishReason: 'STOP',
                        content: { parts: [{ text: '' }] }
                    }]
                }
            })
            .mockResolvedValueOnce({
                response: {
                    candidates: [{
                        finishReason: 'STOP',
                        content: {
                            parts: [{
                                inlineData: {
                                    data: pngBytes.toString('base64'),
                                    mimeType: 'image/png'
                                }
                            }]
                        }
                    }]
                }
            });

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await generateImageWithGemini({ prompt: 'test avatar' });

        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
        expect(fs.existsSync(result)).toBe(true);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('attempt 1/3'));

        fs.unlinkSync(result);
        warnSpy.mockRestore();
    });

    test('throws after exhausting retries', async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                candidates: [{
                    finishReason: 'STOP',
                    content: { parts: [{ text: '' }] }
                }]
            }
        });

        await expect(generateImageWithGemini({ prompt: 'test avatar' })).rejects.toThrow(
            'No image data found in Gemini SDK response'
        );
        expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });
});
