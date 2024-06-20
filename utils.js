const fs = require('fs');
const path = require('path');

const welcomeCountPath = path.join(__dirname, 'welcomeCount.json');

// Function to read the welcome count
function readWelcomeCount() {
    if (fs.existsSync(welcomeCountPath)) {
        const data = fs.readFileSync(welcomeCountPath);
        return JSON.parse(data).count;
    }
    return 0;
}

// Function to write the welcome count
function writeWelcomeCount(count) {
    fs.writeFileSync(welcomeCountPath, JSON.stringify({ count: count }));
}

module.exports = {
    readWelcomeCount,
    writeWelcomeCount
};
