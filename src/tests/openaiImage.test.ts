import axios from 'axios';
import * as fs from 'fs';
import { generateImageWithOpenAI } from '../utils/imageUtils';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('generateImageWithOpenAI', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns URL when OpenAI responds with url', async () => {
        mockAxios.post.mockResolvedValue({
            data: { data: [{ url: 'https://example.com/image.png' }] }
        });

        const result = await generateImageWithOpenAI('blue circle');
        expect(result).toBe('https://example.com/image.png');
        expect(mockAxios.post).toHaveBeenCalledWith(
            'https://api.openai.com/v1/images/generations',
            expect.objectContaining({ model: expect.any(String), prompt: 'blue circle' }),
            expect.any(Object)
        );
    });

    test('writes temp file when OpenAI responds with b64_json', async () => {
        const pngBytes = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        ]);
        mockAxios.post.mockResolvedValue({
            data: { data: [{ b64_json: pngBytes.toString('base64') }] }
        });

        const result = await generateImageWithOpenAI('blue circle');
        expect(fs.existsSync(result)).toBe(true);
        expect(result).toContain('openai-generated-');
        fs.unlinkSync(result);
    });

    test('throws when response has neither url nor b64_json', async () => {
        mockAxios.post.mockResolvedValue({ data: { data: [{}] } });
        await expect(generateImageWithOpenAI('blue circle')).rejects.toThrow('missing url and b64_json');
    });
});
