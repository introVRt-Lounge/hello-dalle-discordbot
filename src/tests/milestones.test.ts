import * as fs from 'fs';
import * as path from 'path';

const milestonesFilePath = path.join(__dirname, '../../data/milestones.json');

describe('milestone celebration persistence (appUtils)', () => {
    let hasCelebratedMilestone: (n: number) => boolean;
    let markMilestoneCelebrated: (
        n: number,
        meta?: { userId?: string; memberCount?: number; reason?: string }
    ) => void;
    let shouldAnnounceMemberMilestone: (humanMemberCount: number, target: number) => boolean;
    let reconcilePastMemberMilestone: (humanMemberCount: number, target: number) => boolean;
    let _resetMilestonesCacheForTests: () => void;

    const originalExists = fs.existsSync(milestonesFilePath);
    const originalContents = originalExists
        ? fs.readFileSync(milestonesFilePath, 'utf-8')
        : null;

    beforeEach(() => {
        jest.resetModules();
        if (fs.existsSync(milestonesFilePath)) {
            fs.unlinkSync(milestonesFilePath);
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const appUtils = require('../utils/appUtils');
        hasCelebratedMilestone = appUtils.hasCelebratedMilestone;
        markMilestoneCelebrated = appUtils.markMilestoneCelebrated;
        shouldAnnounceMemberMilestone = appUtils.shouldAnnounceMemberMilestone;
        reconcilePastMemberMilestone = appUtils.reconcilePastMemberMilestone;
        _resetMilestonesCacheForTests = appUtils._resetMilestonesCacheForTests;
        _resetMilestonesCacheForTests();
    });

    afterAll(() => {
        if (originalContents !== null) {
            fs.writeFileSync(milestonesFilePath, originalContents, 'utf-8');
        } else if (fs.existsSync(milestonesFilePath)) {
            fs.unlinkSync(milestonesFilePath);
        }
    });

    it('starts uncelebrated when no milestones.json exists', () => {
        expect(hasCelebratedMilestone(500)).toBe(false);
        expect(shouldAnnounceMemberMilestone(500, 500)).toBe(true);
    });

    it('persists celebration to disk and survives module reload (simulates reboot)', () => {
        markMilestoneCelebrated(500, {
            userId: 'user-500',
            memberCount: 500,
            reason: 'celebrated',
        });

        expect(fs.existsSync(milestonesFilePath)).toBe(true);
        const onDisk = JSON.parse(fs.readFileSync(milestonesFilePath, 'utf-8'));
        expect(onDisk.celebrated['500']).toBeDefined();
        expect(onDisk.celebrated['500'].userId).toBe('user-500');

        jest.resetModules();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const reloaded = require('../utils/appUtils');
        expect(reloaded.hasCelebratedMilestone(500)).toBe(true);
        expect(reloaded.shouldAnnounceMemberMilestone(500, 500)).toBe(false);
        expect(reloaded.shouldAnnounceMemberMilestone(501, 500)).toBe(false);
    });

    it('does not announce again when human count stays at exactly 500', () => {
        markMilestoneCelebrated(500, { reason: 'celebrated', memberCount: 500 });
        expect(shouldAnnounceMemberMilestone(500, 500)).toBe(false);
    });

    it('silently marks past threshold without announcing when count already above target', () => {
        expect(shouldAnnounceMemberMilestone(512, 500)).toBe(false);
        const marked = reconcilePastMemberMilestone(512, 500);
        expect(marked).toBe(true);
        expect(hasCelebratedMilestone(500)).toBe(true);
        expect(shouldAnnounceMemberMilestone(500, 500)).toBe(false);

        const onDisk = JSON.parse(fs.readFileSync(milestonesFilePath, 'utf-8'));
        expect(onDisk.celebrated['500'].reason).toBe('already_past');
    });

    it('reconcile is a no-op when already celebrated or still below target', () => {
        expect(reconcilePastMemberMilestone(499, 500)).toBe(false);
        expect(hasCelebratedMilestone(500)).toBe(false);

        markMilestoneCelebrated(500, { reason: 'celebrated' });
        expect(reconcilePastMemberMilestone(520, 500)).toBe(false);
    });
});
