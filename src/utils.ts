import fs from 'fs';
import path from 'path';

const welcomeCountPath: string = path.join(__dirname, 'welcomeCount.json');

// Function to read the welcome count
export function readWelcomeCount(): number {
    if (fs.existsSync(welcomeCountPath)) {
        const data = fs.readFileSync(welcomeCountPath, 'utf-8');
        return JSON.parse(data).count;
    }
    return 0;
}

// Function to write the welcome count
export function writeWelcomeCount(count: number): void {
    fs.writeFileSync(welcomeCountPath, JSON.stringify({ count }));
}
