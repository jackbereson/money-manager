import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

try { loadEnvFile('.env.cloudflare.local'); }
catch { console.error('Copy .env.cloudflare.example to .env.cloudflare.local and fill it in.'); process.exit(1); }
const keys = ['MONGODB_URI', 'MONGODB_DB', 'AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'AUTH_URL', 'AUTH_ADMIN_EMAILS', 'AUTH_TRUST_HOST'];
const missing = keys.filter(key => !process.env[key]?.trim());
if (missing.length) { console.error(`Missing configuration: ${missing.join(', ')}`); process.exit(1); }
const uri = process.env.MONGODB_URI;
if (!uri.startsWith('mongodb') || /localhost|127\.0\.0\.1|\[::1\]/i.test(uri)) {
  console.error('MONGODB_URI must point to an online database, not localhost.'); process.exit(1);
}
if (!process.env.AUTH_URL.startsWith('https://') || new URL(process.env.AUTH_URL).pathname !== '/') {
  console.error('AUTH_URL must be your public HTTPS origin.'); process.exit(1);
}
if (process.env.AUTH_SECRET.length < 32) { console.error('AUTH_SECRET must have at least 32 characters.'); process.exit(1); }
// Validate connectivity before uploading any production configuration.
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try { await client.connect(); await client.db(process.env.MONGODB_DB).command({ ping: 1 }); }
catch { console.error('Cannot connect to production MongoDB. Check credentials and Atlas Network Access.'); process.exitCode = 1; }
finally { await client.close(); }
if (process.exitCode) process.exit(process.exitCode);
// These non-sensitive bindings already exist as vars in wrangler.jsonc;
// Cloudflare rejects creating a secret with the same binding name.
const configVars = JSON.parse(readFileSync('wrangler.jsonc', 'utf8')).vars || {};
for (const key of keys.filter(key => key in configVars)) {
  if (process.env[key] !== String(configVars[key])) {
    console.error(`Configuration mismatch for ${key}. Update wrangler.jsonc before uploading secrets.`);
    process.exit(1);
  }
}
const secrets = Object.fromEntries(keys.filter(key => !(key in configVars)).map(key => [key, process.env[key]]));
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'bulk'], {
  input: JSON.stringify(secrets), stdio: ['pipe', 'inherit', 'inherit'], env: process.env,
});
process.exit(result.status ?? 1);
