import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const dataDir = path.join(__dirname, '../../data');
const welcomeCountFilePath = path.join(dataDir, 'welcomeCount.json');
const imageDescriptionCacheFilePath = path.join(dataDir, 'imageDescriptionCache.json');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Function to read the welcome count from the file, or initialize if not present
export function readWelcomeCount(): number {
    if (!fs.existsSync(welcomeCountFilePath)) {
        // Initialize with count 0 if file doesn't exist
        const initialCount = { count: 0 };
        fs.writeFileSync(welcomeCountFilePath, JSON.stringify(initialCount), { encoding: 'utf-8' });
        return 0;
    }

    const data = fs.readFileSync(welcomeCountFilePath, { encoding: 'utf-8' });
    const parsedData = JSON.parse(data);
    return parsedData.count;
}

// Function to write the welcome count to the file
export function writeWelcomeCount(count: number): void {
    const countData = { count };
    fs.writeFileSync(welcomeCountFilePath, JSON.stringify(countData), { encoding: 'utf-8' });
}

// Function to calculate SHA-256 hash of an image file
export function calculateImageHash(imagePath: string): string {
    const imageBuffer = fs.readFileSync(imagePath);
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

// Function to get cached image description, or null if not cached
export function getCachedImageDescription(imageHash: string): string | null {
    if (!fs.existsSync(imageDescriptionCacheFilePath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(imageDescriptionCacheFilePath, { encoding: 'utf-8' });
        const cache = JSON.parse(data);
        return cache[imageHash] || null;
    } catch (error) {
        console.warn('Error reading image description cache:', error);
        return null;
    }
}

// Function to cache an image description
export function setCachedImageDescription(imageHash: string, description: string): void {
    let cache: { [key: string]: string } = {};

    // Load existing cache if it exists
    if (fs.existsSync(imageDescriptionCacheFilePath)) {
        try {
            const data = fs.readFileSync(imageDescriptionCacheFilePath, { encoding: 'utf-8' });
            cache = JSON.parse(data);
        } catch (error) {
            console.warn('Error reading existing image description cache, starting fresh:', error);
        }
    }

    // Update cache
    cache[imageHash] = description;

    // Save cache
    fs.writeFileSync(imageDescriptionCacheFilePath, JSON.stringify(cache, null, 2), { encoding: 'utf-8' });
}
