import * as fs from 'fs';
import * as path from 'path';

jest.mock('../services/welcomeService', () => ({
    welcomeUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/log', () => ({
    logMessage: jest.fn().mockResolvedValue(undefined),
}));

import { welcomeNewMember } from '../commands/welcome';
import { welcomeUser } from '../services/welcomeService';
import { addWelcomedUser, _resetWelcomedUsersCacheForTests } from '../utils/appUtils';

const welcomedUsersFilePath = path.join(__dirname, '../../data/welcomedUsers.json');

function makeMember(userId: string, displayName = 'TestUser', botspamSend?: jest.Mock) {
    const channelsCacheGet = jest.fn(() => {
        if (!botspamSend) return undefined;
        return {
            isTextBased: () => true,
            send: botspamSend,
        };
    });
    return {
        displayName,
        user: { id: userId, bot: false },
        guild: {
            channels: { cache: { get: channelsCacheGet } },
            members: { cache: { filter: () => ({ size: 0 }) } },
        },
    } as any;
}

describe('welcomeNewMember rejoiner short-circuit', () => {
    let backup: string | null = null;

    beforeEach(() => {
        backup = fs.existsSync(welcomedUsersFilePath)
            ? fs.readFileSync(welcomedUsersFilePath, 'utf-8')
            : null;
        if (fs.existsSync(welcomedUsersFilePath)) fs.unlinkSync(welcomedUsersFilePath);
        _resetWelcomedUsersCacheForTests();
        (welcomeUser as jest.Mock).mockClear();
    });

    afterEach(() => {
        if (fs.existsSync(welcomedUsersFilePath)) fs.unlinkSync(welcomedUsersFilePath);
        if (backup !== null) {
            fs.writeFileSync(welcomedUsersFilePath, backup, 'utf-8');
        }
        _resetWelcomedUsersCacheForTests();
    });

    it('calls welcomeUser for a brand new member', async () => {
        const member = makeMember('111');
        await welcomeNewMember({} as any, member);
        expect(welcomeUser).toHaveBeenCalledTimes(1);
    });

    it('skips welcomeUser when the member ID is already in welcomedUsers', async () => {
        addWelcomedUser('222');
        const botspamSend = jest.fn().mockResolvedValue(undefined);
        const member = makeMember('222', 'ReturnedUser', botspamSend);

        await welcomeNewMember({} as any, member);

        expect(welcomeUser).not.toHaveBeenCalled();
        expect(botspamSend).toHaveBeenCalledTimes(1);
        const sent = botspamSend.mock.calls[0][0];
        expect(sent).toContain('Welcome back');
        expect(sent).toContain('<@222>');
    });

    it('still skips welcomeUser even if the botspam channel is missing', async () => {
        addWelcomedUser('333');
        const member = makeMember('333');
        await expect(welcomeNewMember({} as any, member)).resolves.toBeUndefined();
        expect(welcomeUser).not.toHaveBeenCalled();
    });
});
