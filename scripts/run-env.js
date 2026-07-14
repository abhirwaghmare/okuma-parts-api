/**
 * Cross-platform env runner.
 * Sets APP_ENV and spawns `tsx watch src/index.ts` as a child process.
 * Works on Windows (cmd/PowerShell) and Unix without cross-env.
 *
 * Usage: node scripts/run-env.js <dev|qa>
 */
import { spawn } from 'child_process';

const env = process.argv[2];
if (!env) {
    console.error('Usage: node scripts/run-env.js <dev|qa>');
    process.exit(1);
}

const child = spawn('tsx', ['watch', 'src/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, APP_ENV: env },
    shell: true,
});

child.on('exit', code => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
