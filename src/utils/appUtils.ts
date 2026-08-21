import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const dataDir = path.join(__dirname, '../../data');
const welcomeCountFilePath = path.join(dataDir, 'welcomeCount.json');
const imageDescriptionCacheFilePath = path.join(dataDir, 'imageDescriptionCache.json');
const welcomedUsersFilePath = path.join(dataDir, 'welcomedUsers.json');
const milestone500FilePath = path.join(dataDir, 'milestone500.json');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory cache of welcomed user IDs. Lazy-loaded on first access so unit tests
// can override the file path before initialization. Holds Discord snowflake IDs as strings.
let welcomedUserIdsCache: Set<string> | null = null;

function loadWelcomedUserIdsFromDisk(): Set<string> {
    if (!fs.existsSync(welcomedUsersFilePath)) {
        return new Set<string>();
    }
    try {
        const data = fs.readFileSync(welcomedUsersFilePath, { encoding: 'utf-8' });
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed?.ids)) {
            return new Set<string>(parsed.ids.map((id: unknown) => String(id)));
        }
        return new Set<string>();
    } catch (error) {
        console.warn('Error reading welcomedUsers.json, treating as empty:', error);
        return new Set<string>();
    }
}

function ensureCacheLoaded(): Set<string> {
    if (welcomedUserIdsCache === null) {
        welcomedUserIdsCache = loadWelcomedUserIdsFromDisk();
    }
    return welcomedUserIdsCache;
}

function persistWelcomedUserIds(ids: Set<string>): void {
    // Atomic write: stage to tmp then rename so a crash mid-write cannot corrupt the file.
    const tmpPath = `${welcomedUsersFilePath}.tmp`;
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const payload = JSON.stringify({ ids: Array.from(ids) }, null, 2);
        fs.writeFileSync(tmpPath, payload, { encoding: 'utf-8' });
        fs.renameSync(tmpPath, welcomedUsersFilePath);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
            `FATAL: failed to persist welcomedUsers.json (${ids.size} ids) to ${welcomedUsersFilePath}: ${message}`
        );
        throw error;
    }
}

export function hasWelcomedUser(userId: string): boolean {
    return ensureCacheLoaded().has(String(userId));
}

export function addWelcomedUser(userId: string): void {
    const ids = ensureCacheLoaded();
    const id = String(userId);
    if (ids.has(id)) return;
    ids.add(id);
    persistWelcomedUserIds(ids);
}

/** Bulk-add IDs (e.g. seed current roster when the persist file was lost). Returns how many were newly added. */
export function seedWelcomedUsers(userIds: string[]): number {
    const ids = ensureCacheLoaded();
    let added = 0;
    for (const raw of userIds) {
        const id = String(raw);
        if (ids.has(id)) continue;
        ids.add(id);
        added++;
    }
    if (added > 0) {
        persistWelcomedUserIds(ids);
    }
    return added;
}

export function readWelcomedUserIds(): string[] {
    return Array.from(ensureCacheLoaded());
}

export function getWelcomedUserCount(): number {
    return ensureCacheLoaded().size;
}

/** True when the golden 500-member VIP welcome has already been fired once. */
export function hasCelebratedMilestone500(): boolean {
    if (!fs.existsSync(milestone500FilePath)) {
        return false;
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(milestone500FilePath, { encoding: 'utf-8' }));
        return parsed?.celebrated === true;
    } catch (error) {
        console.warn('Error reading milestone500.json, treating as not celebrated:', error);
        return false;
    }
}

export function markMilestone500Celebrated(): void {
    const payload = JSON.stringify(
        { celebrated: true, celebratedAt: new Date().toISOString() },
        null,
        2
    );
    fs.writeFileSync(milestone500FilePath, payload, { encoding: 'utf-8' });
}

// Test-only: drop the in-memory cache so the next access reloads from disk.
// Production code never calls this; it is exported for Jest setup/teardown.
export function _resetWelcomedUsersCacheForTests(): void {
    welcomedUserIdsCache = null;
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
