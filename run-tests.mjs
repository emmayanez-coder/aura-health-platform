import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('.', import.meta.url));
const tests = readdirSync(cwd).filter(name => /^test(?:-.*)?\.mjs$/.test(name)).sort();
let failures = 0;
for (const test of tests) {
  console.log(`\nRunning ${test}`);
  const result = spawnSync(process.execPath, [test], { cwd, stdio: 'inherit' });
  if (result.error || result.status !== 0) failures++;
}
console.log(`\n${tests.length - failures}/${tests.length} test scripts passed.`);
process.exitCode = failures ? 1 : 0;
