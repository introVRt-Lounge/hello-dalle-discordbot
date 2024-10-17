import fs from 'fs';
import path from 'path';

const dataDir = path.join(__dirname, '../../data');
const welcomeCountFilePath = path.join(dataDir, 'welcomeCount.json');

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
