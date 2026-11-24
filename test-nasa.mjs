import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {integrateNasaRadiation} from './dist/nasa-radiation.mjs';
const data=JSON.parse(fs.readFileSync(new URL('./dist/data/nasa-rad-20240101-20240107.json',import.meta.url),'utf8'));
const all=integrateNasaRadiation(data);
assert.equal(all.observations,591);assert.equal(all.accepted,574);assert.equal(all.rejected,17);
assert.equal(all.gaps,34);assert.ok(Math.abs(all.doseMGy-1.1422091784019819)<1e-12);
assert.ok(all.coveragePercent<100&&all.coveragePercent>90);
assert.equal(all.provenance.rows,undefined);
const one=integrateNasaRadiation(data,'2024-01-01','2024-01-01');
assert.equal(one.observations,85);assert.equal(one.rejected,1);assert.ok(one.doseMGy<all.doseMGy);
assert.throws(()=>integrateNasaRadiation(data,'2024-01-05','2024-01-01'));
assert.throws(()=>integrateNasaRadiation(data,'2025-01-01','2025-01-07'));
assert.throws(()=>integrateNasaRadiation({...data,sourceUnits:'mSv/day'}));
for(const source of data.sourceFiles){
  const original=fs.readFileSync(new URL('./reproducibility/raw/'+source.file,import.meta.url));
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'),source.sha256);
}
const row=(minute,accepted=true)=>({timestamp:new Date(Date.UTC(2024,0,1,0,minute)).toISOString(),doseRateUGyPerDay:1440,accepted,qualityFlag:accepted?'':'Cmds',aliveTimeSeconds:900});
let synthetic={...data,rows:[row(0),row(30),row(60,false),row(90),row(120)]};
let r=integrateNasaRadiation(synthetic);assert.equal(r.doseMGy,.06);assert.equal(r.gaps,2);assert.equal(r.series[2].breakBefore,true);
synthetic={...data,rows:[row(0),row(30),row(120),row(150)]};
r=integrateNasaRadiation(synthetic);assert.equal(r.doseMGy,.06);assert.equal(r.gaps,1);
assert.equal(r.series[2].breakBefore,true);
console.log('PASS: NASA source hashes, record counts, exact cumulative dose, subranges, invalid units/dates, quality rejection and gap exclusion.');
console.log(JSON.stringify({doseMGy:all.doseMGy,coveredDays:all.coveredDays,coveragePercent:all.coveragePercent,meanDoseRateUGyPerDay:all.meanDoseRateUGyPerDay}));
