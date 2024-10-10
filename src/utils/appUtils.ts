import fs from 'fs';
import path from 'path';

const welcomeCountFilePath = path.join(__dirname, '../../data/welcomeCount.txt');

// Function to ensure the welcome count file is provisioned correctly
export function provisionWelcomeCountFile(): void {
    if (!fs.existsSync(welcomeCountFilePath)) {
        fs.writeFileSync(welcomeCountFilePath, '0', 'utf-8');
        console.log('Welcome count file created with initial count of 0.');
    }
}

// Function to read the welcome count
export function readWelcomeCount(): number {
    if (fs.existsSync(welcomeCountFilePath)) {
        const count = fs.readFileSync(welcomeCountFilePath, 'utf-8');
        return parseInt(count, 10);
    }
    return 0; // Fallback if the file doesn't exist (though provision should prevent this)
}

// Function to write the welcome count
export function writeWelcomeCount(count: number): void {
    fs.writeFileSync(welcomeCountFilePath, count.toString(), 'utf-8');
}
