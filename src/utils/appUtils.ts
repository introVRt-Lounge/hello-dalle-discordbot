import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const dataDir = path.join(__dirname, '../../data');
const welcomeCountFilePath = path.join(dataDir, 'welcomeCount.json');
const imageDescriptionCacheFilePath = path.join(dataDir, 'imageDescriptionCache.json');
const welcomedUsersFilePath = path.join(dataDir, 'welcomedUsers.json');
const milestonesFilePath = path.join(dataDir, 'milestones.json');

/** Human-member VIP celebration target (excludes bots). */
export const HUMAN_MEMBER_MILESTONE_500 = 500;

type MilestoneRecord = {
    celebratedAt: string;
    userId?: string;
    memberCount?: number;
    reason?: string;
};

type MilestonesFile = {
    celebrated: Record<string, MilestoneRecord>;
};

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
    const payload = JSON.stringify({ ids: Array.from(ids) }, null, 2);
    fs.writeFileSync(tmpPath, payload, { encoding: 'utf-8' });
    fs.renameSync(tmpPath, welcomedUsersFilePath);
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

export function readWelcomedUserIds(): string[] {
    return Array.from(ensureCacheLoaded());
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

// --- Member-count milestones (durable across container recreate / image update) ---

let milestonesCache: MilestonesFile | null = null;

function loadMilestonesFromDisk(): MilestonesFile {
    if (!fs.existsSync(milestonesFilePath)) {
        return { celebrated: {} };
    }
    try {
        const data = fs.readFileSync(milestonesFilePath, { encoding: 'utf-8' });
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && parsed.celebrated && typeof parsed.celebrated === 'object') {
            return { celebrated: parsed.celebrated as Record<string, MilestoneRecord> };
        }
        return { celebrated: {} };
    } catch (error) {
        console.warn('Error reading milestones.json, treating as empty:', error);
        return { celebrated: {} };
    }
}

function ensureMilestonesLoaded(): MilestonesFile {
    if (milestonesCache === null) {
        milestonesCache = loadMilestonesFromDisk();
    }
    return milestonesCache;
}

function persistMilestones(state: MilestonesFile): void {
    const tmpPath = `${milestonesFilePath}.tmp`;
    const payload = JSON.stringify(state, null, 2);
    fs.writeFileSync(tmpPath, payload, { encoding: 'utf-8' });
    fs.renameSync(tmpPath, milestonesFilePath);
}

export function hasCelebratedMilestone(target: number): boolean {
    const key = String(target);
    return Boolean(ensureMilestonesLoaded().celebrated[key]);
}

export function markMilestoneCelebrated(
    target: number,
    meta: { userId?: string; memberCount?: number; reason?: string } = {}
): void {
    const state = ensureMilestonesLoaded();
    const key = String(target);
    state.celebrated[key] = {
        celebratedAt: new Date().toISOString(),
        userId: meta.userId,
        memberCount: meta.memberCount,
        reason: meta.reason ?? 'celebrated',
    };
    persistMilestones(state);
}

/**
 * Announce only when current human count is exactly the target and we have not
 * already celebrated that milestone on durable disk.
 */
export function shouldAnnounceMemberMilestone(humanMemberCount: number, target: number): boolean {
    return humanMemberCount === target && !hasCelebratedMilestone(target);
}

/**
 * If the guild is already past the target and we never recorded a celebration,
 * mark it silently so we do not VIP-spam on later joins (missed exact crossing).
 * Returns true when a new silent mark was written.
 */
export function reconcilePastMemberMilestone(humanMemberCount: number, target: number): boolean {
    if (humanMemberCount <= target) return false;
    if (hasCelebratedMilestone(target)) return false;
    markMilestoneCelebrated(target, {
        memberCount: humanMemberCount,
        reason: 'already_past',
    });
    return true;
}

/** Test-only: drop in-memory milestones cache so the next access reloads from disk. */
export function _resetMilestonesCacheForTests(): void {
    milestonesCache = null;
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
