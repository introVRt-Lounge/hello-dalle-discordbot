"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readWelcomeCount = readWelcomeCount;
exports.writeWelcomeCount = writeWelcomeCount;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const welcomeCountPath = path_1.default.join(__dirname, 'welcomeCount.json');
// Function to read the welcome count
function readWelcomeCount() {
    if (fs_1.default.existsSync(welcomeCountPath)) {
        const data = fs_1.default.readFileSync(welcomeCountPath, 'utf-8');
        return JSON.parse(data).count;
    }
    return 0;
}
// Function to write the welcome count
function writeWelcomeCount(count) {
    fs_1.default.writeFileSync(welcomeCountPath, JSON.stringify({ count }));
}
