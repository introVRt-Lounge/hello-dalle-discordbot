import { getDEFAULT_ENGINE, setDEFAULT_ENGINE } from '../config';

describe('Engine Tests', () => {
    test('should get and set default engine correctly', () => {
        // Test default engine
        expect(getDEFAULT_ENGINE()).toBe('dalle');

        // Test setting to Gemini
        setDEFAULT_ENGINE('gemini');
        expect(getDEFAULT_ENGINE()).toBe('gemini');

        // Test setting back to DALL-E
        setDEFAULT_ENGINE('dalle');
        expect(getDEFAULT_ENGINE()).toBe('dalle');
    });

    test('should throw error for invalid engine', () => {
        expect(() => {
            // @ts-ignore - Testing invalid input
            setDEFAULT_ENGINE('invalid');
        }).toThrow('DEFAULT_ENGINE must be either \'dalle\' or \'gemini\'.');
    });
});
