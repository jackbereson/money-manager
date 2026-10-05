import { spawnSync } from 'node:child_process';
import { localEnvironment, assertSafeArtifacts } from './artifact-security.mjs';
const env = { ...process.env };
for (const key of Object.keys(localEnvironment())) env[key] = '';
for (const key of Object.keys(env)) if (/^(AUTH_|MONGODB_|CLOUDFLARE_API_TOKEN$)/.test(key)) env[key] = '';
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { env, stdio: 'inherit', windowsHide: true });
if (result.status !== 0) process.exit(result.status ?? 1);
assertSafeArtifacts();
