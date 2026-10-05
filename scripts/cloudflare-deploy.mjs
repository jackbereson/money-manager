import { spawnSync } from 'node:child_process';
import { assertSafeArtifacts } from './artifact-security.mjs';

try { assertSafeArtifacts(); }
catch (error) { console.error(error.message); process.exit(1); }
const result = spawnSync(process.execPath, ['./node_modules/@opennextjs/cloudflare/dist/cli/index.js', 'deploy', '--', '--keep-vars'], { stdio: 'inherit', windowsHide: true });
process.exit(result.status ?? 1);
