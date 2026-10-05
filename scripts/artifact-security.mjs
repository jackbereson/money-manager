import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseEnv } from 'node:util';

export const emptyEnvArtifact = 'export const production = {};\nexport const development = {};\nexport const test = {};\n';

export function localEnvironment() {
  const values = {};
  for (const name of readdirSync('.')) {
    if (name.startsWith('.env') && !name.endsWith('.example') && statSync(name).isFile()) {
      Object.assign(values, parseEnv(readFileSync(name, 'utf8')));
    }
  }
  return values;
}

export function removeCopiedEnvironmentFiles(directory = '.open-next') {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) removeCopiedEnvironmentFiles(path);
    else if (entry.isFile() && /^\.env|^\.dev\.vars/i.test(entry.name)) unlinkSync(path);
  }
}

export function assertSafeArtifacts() {
  const artifact = '.open-next/cloudflare/next-env.mjs';
  if (!existsSync(artifact) || readFileSync(artifact, 'utf8').replace(/\s/g, '') !== emptyEnvArtifact.replace(/\s/g, '')) {
    throw new Error('Deployment blocked: Worker environment artifact is not empty. Run npm run cf:build.');
  }
  const secrets = new Set();
  for (const [key, value] of Object.entries({ ...localEnvironment(), ...process.env })) {
    if (/(SECRET|PASSWORD|TOKEN|PRIVATE|MONGODB_URI|DATABASE_URL|API_KEY)/i.test(key) && value?.length >= 12) secrets.add(value);
  }
  if (existsSync('key')) {
    const token = readFileSync('key', 'utf8').match(/Bearer\s+([A-Za-z0-9_-]+)/)?.[1];
    if (token) secrets.add(token);
  }
  const needles = [...secrets].flatMap(value => [...new Set([value, JSON.stringify(value).slice(1, -1), encodeURIComponent(value)])].map(text => Buffer.from(text)));
  let files = 0;
  function inspect(root, directory = root) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      // OpenNext creates server dependency junctions as bundler inputs on Windows.
      // The generated Worker bundle is scanned below; public assets may not link
      // to anything outside the upload directory.
      if (entry.isSymbolicLink()) {
        if (root === 'public' || root === '.open-next/assets' || relative('.open-next/assets', path).startsWith('..') === false) {
          throw new Error(`Deployment blocked: public artifact symlink at ${path}`);
        }
        continue;
      }
      if (/^\.env|^\.git$|^key$|^\.dev\.vars/i.test(entry.name)) throw new Error(`Deployment blocked: credential file at ${path}`);
      if (entry.isDirectory()) { inspect(root, path); continue; }
      if (!entry.isFile()) continue;
      const content = readFileSync(path);
      if (needles.some(needle => content.includes(needle)) || /GOCSPX-[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|mongodb(?:\+srv)?:\/\/[^/\s"']+:[^@\s"']+@/.test(content.toString('utf8'))) {
        // Never print the matching value or file contents.
        throw new Error(`Deployment blocked: secret detected in ${path}`);
      }
      if ((root === 'public' || root === '.open-next/assets') && /\.map$/i.test(relative(root, path))) throw new Error(`Deployment blocked: public source map at ${path}`);
      files++;
    }
  }
  for (const root of ['public', '.open-next']) if (existsSync(root)) inspect(root);
  // Assets live under .open-next; explicitly disallow browser source maps there.
  if (existsSync('.open-next/assets')) inspect('.open-next/assets');
  console.log(`Artifact security check passed (${files} files; no credentials or known secret values).`);
}
