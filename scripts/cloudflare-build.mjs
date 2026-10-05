import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { assertSafeArtifacts, emptyEnvArtifact, localEnvironment, removeCopiedEnvironmentFiles } from './artifact-security.mjs';

// Block dotenv values from entering the compiler. All app configuration is
// supplied through Cloudflare runtime bindings after deployment.
const buildEnv = { ...process.env };
for (const key of Object.keys(localEnvironment())) buildEnv[key] = '';
for (const key of Object.keys(buildEnv)) {
  if (/^(AUTH_|MONGODB_|CLOUDFLARE_API_TOKEN$)/.test(key)) buildEnv[key] = '';
}
const result = spawnSync(process.execPath, ['--import', './scripts/windows-symlinks.mjs', './node_modules/@opennextjs/cloudflare/dist/cli/index.js', 'build'], { stdio: 'inherit', windowsHide: true, env: buildEnv });
if (result.status !== 0) process.exit(result.status ?? 1);
// OpenNext copies .env.local into next-env.mjs by default. Production must use
// Cloudflare runtime secrets only, never the developer's database or credentials.
writeFileSync('.open-next/cloudflare/next-env.mjs', emptyEnvArtifact);
removeCopiedEnvironmentFiles();
console.log('Removed local environment values from the Worker artifact.');
assertSafeArtifacts();
