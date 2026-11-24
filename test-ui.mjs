import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=new URL('./dist/',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const app=fs.readFileSync(new URL('app.mjs',root),'utf8');
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate HTML IDs');
for(const [,id] of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(id),'Missing UI target: '+id);
for(const [,id] of app.matchAll(/text\('([^']+)'/g))assert.ok(ids.includes(id),'Missing text target: '+id);
for(const [,asset] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(asset.startsWith('https:') || asset==='/wp-login.php')continue; // Host WordPress route, not a dashboard asset.
  assert.ok(fs.existsSync(new URL(asset.split('?')[0],root)),'Missing local asset: '+asset);
}
assert.ok(app.includes("radiation.kind==='nasa-rad'"));
assert.ok(app.includes('loadNasa();'));
assert.ok(!app.includes('Synthetic demonstration (not a NASA dataset)'));
console.log('PASS: unique HTML IDs, all app element references, local asset paths, NASA initialization and removal of synthetic radiation substitution.');
