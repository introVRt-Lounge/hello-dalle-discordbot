import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
    assertRuntimeDirsWritable,
    getRequiredWritableDirs
} from '../utils/runtimeWritability';

describe('runtimeWritability', () => {
    it('resolves production paths under /usr/src/app', () => {
        const dirs = getRequiredWritableDirs({ NODE_ENV: 'production' });
        expect(dirs).toEqual([
            '/usr/src/app/welcome_images',
            '/usr/src/app/profile_images',
            '/usr/src/app/data',
            '/usr/src/app/temp',
            '/usr/src/app/logs'
        ]);
    });

    it('passes when directories are writable', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hello-dalle-writable-'));
        expect(() => assertRuntimeDirsWritable([dir])).not.toThrow();
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('throws when a directory is not writable', () => {
        if (process.getuid && process.getuid() === 0) {
            // Root can write to mode 0555 directories; skip on root runners.
            return;
        }
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hello-dalle-ro-'));
        fs.chmodSync(dir, 0o555);
        expect(() => assertRuntimeDirsWritable([dir])).toThrow(/not writable/);
        fs.chmodSync(dir, 0o755);
        fs.rmSync(dir, { recursive: true, force: true });
    });
});
