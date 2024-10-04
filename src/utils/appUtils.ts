import fs from 'fs';
import path from 'path';

const WELCOME_COUNT_PATH = path.join(__dirname, '../../data/welcomeCount.json'); // Store it outside of 'dist'

// Read welcome count from file
export function readWelcomeCount(): number {
    try {
        const data = fs.readFileSync(WELCOME_COUNT_PATH, 'utf-8');
        return JSON.parse(data).count;
    } catch (error) {
        console.error('Error reading welcome count:', error);
        return 0;
    }
}

// Write welcome count to file
export function writeWelcomeCount(count: number): void {
    try {
        fs.writeFileSync(WELCOME_COUNT_PATH, JSON.stringify({ count }));
    } catch (error) {
        console.error('Error writing welcome count:', error);
        throw error;
    }
}
