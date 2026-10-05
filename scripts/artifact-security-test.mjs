import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { assertSafeArtifacts } from './artifact-security.mjs';

const canary = 'artifact-security-canary-7ae0ae6b';
const previousSecret = process.env.ARTIFACT_TEST_SECRET;
process.env.ARTIFACT_TEST_SECRET = canary;
try {
  for (const [path, content, expected] of [
    ['webapp/out/__security_canary.txt', canary, /secret detected/],
    ['webapp/out/.env.security-canary', 'NOT_A_REAL_SECRET=true', /credential file/],
    ['webapp/out/__security_canary.map', '{}', /public source map/],
  ]) {
    assert.equal(existsSync(path), false, 'Do not overwrite existing artifacts');
    try {
      writeFileSync(path, content);
      assert.throws(assertSafeArtifacts, expected);
      console.log(`PASS deployment rejected ${path}`);
    } finally { unlinkSync(path); }
  }
  assertSafeArtifacts();
} finally {
  if (previousSecret === undefined) delete process.env.ARTIFACT_TEST_SECRET;
  else process.env.ARTIFACT_TEST_SECRET = previousSecret;
}
