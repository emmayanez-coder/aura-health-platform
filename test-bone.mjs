import assert from 'node:assert/strict';
import {boneReference, BONE_REFERENCE} from './dist/bone-reference.mjs';
assert.deepEqual([boneReference(0).lower,boneReference(0).upper],[100,100]);
assert.deepEqual([boneReference(30).lower,boneReference(30).upper],[98,99]);
assert.deepEqual([boneReference(180).lower,boneReference(180).upper],[88,94]);
for(const day of [-1,181,Infinity,NaN,'180',null]) assert.throws(()=>boneReference(day),RangeError);
for(let day=0;day<=180;day++) {
  const r=boneReference(day);
  assert.ok(r.lower<=r.upper && r.upper<=100);
  assert.equal(r.series.at(-1).lower,r.lower);
  assert.ok(r.series.every((p,i,a)=>!i||p.lower<=a[i-1].lower));
}
const exported=JSON.parse(JSON.stringify(boneReference(180)));
assert.equal(exported.model.sources.length,2);
assert.equal(exported.model.id,BONE_REFERENCE.id);
console.log('PASS: bone baseline, monthly and 180-day endpoints, invalid inputs, monotonic ranges and export provenance.');
