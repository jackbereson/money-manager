import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let envArtifact;
try { envArtifact = readFileSync('.open-next/cloudflare/next-env.mjs', 'utf8'); }
catch { console.error('Run npm run cf:build before deployment.'); process.exit(1); }
if (envArtifact.replace(/\s/g, '') !== 'exportconstproduction={};exportconstdevelopment={};exportconsttest={};') {
  console.error('Deployment blocked: artifact contains local environment values. Run npm run cf:build.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['./node_modules/@opennextjs/cloudflare/dist/cli/index.js', 'deploy', '--', '--keep-vars'], { stdio: 'inherit', windowsHide: true });
process.exit(result.status ?? 1);
