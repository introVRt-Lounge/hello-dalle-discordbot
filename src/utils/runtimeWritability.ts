import * as fs from 'fs';
import * as path from 'path';

/**
 * Directories the bot must be able to write at runtime.
 * In production these are typically Docker named volumes.
 */
export function getRequiredWritableDirs(env: NodeJS.ProcessEnv = process.env): string[] {
    const isProd = env.NODE_ENV === 'production';
    const appRoot = isProd ? '/usr/src/app' : path.join(__dirname, '../..');
    return [
        path.join(appRoot, 'welcome_images'),
        path.join(appRoot, 'profile_images'),
        path.join(appRoot, 'data'),
        path.join(appRoot, 'temp'),
        path.join(appRoot, 'logs')
    ];
}

/**
 * Probe each required directory for create/delete of a temp file.
 * Throws with a clear message if any path is not writable (fail closed).
 */
export function assertRuntimeDirsWritable(
    dirs: string[] = getRequiredWritableDirs(),
    probePrefix = 'writability_probe'
): void {
    const failures: string[] = [];

    for (const dir of dirs) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            const probe = path.join(dir, `.${probePrefix}_${process.pid}_${Date.now()}`);
            fs.writeFileSync(probe, 'ok', { encoding: 'utf-8' });
            fs.unlinkSync(probe);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            failures.push(`${dir} (${detail})`);
        }
    }

    if (failures.length > 0) {
        throw new Error(
            `Required runtime directories are not writable: ${failures.join('; ')}. ` +
            `Non-root container + root-owned Docker volumes usually cause this (issue #132).`
        );
    }
}
