import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const result = spawnSync(process.execPath, ['--import', './scripts/windows-symlinks.mjs', './node_modules/@opennextjs/cloudflare/dist/cli/index.js', 'build'], { stdio: 'inherit', windowsHide: true });
if (result.status !== 0) process.exit(result.status ?? 1);
// OpenNext copies .env.local into next-env.mjs by default. Production must use
// Cloudflare runtime secrets only, never the developer's database or credentials.
writeFileSync('.open-next/cloudflare/next-env.mjs', 'export const production = {};\nexport const development = {};\nexport const test = {};\n');
console.log('Removed local environment values from the Worker artifact.');
