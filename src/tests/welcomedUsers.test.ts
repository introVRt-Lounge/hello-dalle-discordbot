import * as fs from 'fs';
import * as path from 'path';
import {
    hasWelcomedUser,
    addWelcomedUser,
    readWelcomedUserIds,
    _resetWelcomedUsersCacheForTests,
} from '../utils/appUtils';

const welcomedUsersFilePath = path.join(__dirname, '../../data/welcomedUsers.json');
const tmpFilePath = `${welcomedUsersFilePath}.tmp`;

describe('welcomedUsers persistence (appUtils)', () => {
    let backup: string | null = null;

    beforeEach(() => {
        backup = fs.existsSync(welcomedUsersFilePath)
            ? fs.readFileSync(welcomedUsersFilePath, 'utf-8')
            : null;
        if (fs.existsSync(welcomedUsersFilePath)) fs.unlinkSync(welcomedUsersFilePath);
        if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
        _resetWelcomedUsersCacheForTests();
    });

    afterEach(() => {
        if (fs.existsSync(welcomedUsersFilePath)) fs.unlinkSync(welcomedUsersFilePath);
        if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
        if (backup !== null) {
            fs.writeFileSync(welcomedUsersFilePath, backup, 'utf-8');
        }
        _resetWelcomedUsersCacheForTests();
    });

    it('returns false for an unknown user with no file present', () => {
        expect(hasWelcomedUser('123456789012345678')).toBe(false);
        expect(readWelcomedUserIds()).toEqual([]);
    });

    it('records a new user and finds them again', () => {
        addWelcomedUser('111');
        expect(hasWelcomedUser('111')).toBe(true);
        expect(hasWelcomedUser('222')).toBe(false);
    });

    it('persists added IDs across cache reset (simulates bot restart)', () => {
        addWelcomedUser('111');
        addWelcomedUser('222');

        _resetWelcomedUsersCacheForTests();

        expect(hasWelcomedUser('111')).toBe(true);
        expect(hasWelcomedUser('222')).toBe(true);
        expect(readWelcomedUserIds().sort()).toEqual(['111', '222']);
    });

    it('is idempotent: duplicate add does not double the entry', () => {
        addWelcomedUser('111');
        addWelcomedUser('111');
        addWelcomedUser('111');
        expect(readWelcomedUserIds()).toEqual(['111']);
    });

    it('writes JSON in the expected schema { ids: string[] }', () => {
        addWelcomedUser('alice');
        addWelcomedUser('bob');
        const raw = JSON.parse(fs.readFileSync(welcomedUsersFilePath, 'utf-8'));
        expect(raw).toHaveProperty('ids');
        expect(Array.isArray(raw.ids)).toBe(true);
        expect(raw.ids).toEqual(expect.arrayContaining(['alice', 'bob']));
        expect(raw.ids).toHaveLength(2);
    });

    it('coerces non-string IDs to strings (defensive against caller mistakes)', () => {
        addWelcomedUser(987654321 as unknown as string);
        expect(hasWelcomedUser('987654321')).toBe(true);
        expect(hasWelcomedUser(987654321 as unknown as string)).toBe(true);
    });

    it('treats a corrupt file as empty (does not throw)', () => {
        fs.writeFileSync(welcomedUsersFilePath, '{ this is not valid json', 'utf-8');
        _resetWelcomedUsersCacheForTests();
        expect(hasWelcomedUser('111')).toBe(false);
        addWelcomedUser('111');
        expect(hasWelcomedUser('111')).toBe(true);
    });

    it('does not leave a .tmp file behind after a successful write', () => {
        addWelcomedUser('111');
        expect(fs.existsSync(tmpFilePath)).toBe(false);
    });
});
