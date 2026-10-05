import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseEnv } from 'node:util';

function localEnvironmentRecords() {
  const records = [];
  for (const name of [...readdirSync('.'), ...readdirSync('backend').map(name => join('backend', name))]) {
    if (name.split(/[\\/]/).pop().startsWith('.env') && !name.endsWith('.example') && statSync(name).isFile()) {
      records.push(parseEnv(readFileSync(name, 'utf8')));
    }
  }
  return records;
}

export function localEnvironment() {
  return Object.assign({}, ...localEnvironmentRecords());
}

export function assertSafeArtifacts() {
  if (!existsSync('out/index.html')) throw new Error('Build the static frontend before scanning artifacts.');
  const secrets = new Set();
  for (const record of [...localEnvironmentRecords(), process.env]) {
    for (const [key, value] of Object.entries(record)) {
      if (/(SECRET|PASSWORD|TOKEN|PRIVATE|MONGODB_URI|DATABASE_URL|API_KEY)/i.test(key) && value?.length >= 12) secrets.add(value);
    }
  }
  if (existsSync('key')) {
    const keyContent = readFileSync('key', 'utf8');
    const token = keyContent.match(/Bearer\s+([A-Za-z0-9_-]+)/)?.[1];
    if (token) secrets.add(token);
    for (const line of keyContent.split(/\r?\n/).map(value => value.trim()).filter(value => value && !/curl|Bearer/i.test(value))) {
      // The user may append database credentials to the ignored key file.
      if (line.length >= 12) secrets.add(line);
    }
  }
  const needles = [...secrets].flatMap(value => [...new Set([value, JSON.stringify(value).slice(1, -1), encodeURIComponent(value)])].map(text => Buffer.from(text)));
  let files = 0;
  function inspect(root, directory = root) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Deployment blocked: public artifact symlink at ${path}`);
      if (/^\.env|^\.git$|^key$|^\.dev\.vars/i.test(entry.name)) throw new Error(`Deployment blocked: credential file at ${path}`);
      if (entry.isDirectory()) { inspect(root, path); continue; }
      if (!entry.isFile()) continue;
      const content = readFileSync(path);
      if (needles.some(needle => content.includes(needle)) || /GOCSPX-[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|mongodb(?:\+srv)?:\/\/[^/\s"']+:[^@\s"']+@/.test(content.toString('utf8'))) {
        // Never print the matching value or file contents.
        throw new Error(`Deployment blocked: secret detected in ${path}`);
      }
      if ((root === 'public' || root === 'out') && /\.map$/i.test(relative(root, path))) throw new Error(`Deployment blocked: public source map at ${path}`);
      files++;
    }
  }
  for (const root of ['public', 'out']) if (existsSync(root)) inspect(root);
  console.log(`Artifact security check passed (${files} files; no credentials or known secret values).`);
}
