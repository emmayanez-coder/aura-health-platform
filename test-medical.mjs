import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TRAINING,startTraining,trainingEvent,trainingHandover,mountMedicalAssist} from './dist/medical-assist.mjs';
let s=startTraining('2026-11-14T12:00:00Z','test-incident');
assert.equal(s.simulation,true);assert.equal(s.index,0);
for(const type of ['play','pause','audio-ended','audio-error']) {s=trainingEvent(s,type);assert.equal(s.index,0);assert.equal(s.steps[0].status,'pending');}
s=trainingEvent(s,'unable');assert.equal(s.index,0);assert.equal(s.steps[0].status,'unable');
assert.throws(()=>trainingEvent(s,'followup'));
s=trainingEvent(s,'note','Fictional training note');s=trainingEvent(s,'confirm');
assert.equal(s.index,1);assert.throws(()=>trainingEvent(s,'confirm'),/contact status/);
s=trainingEvent(s,'communication','attempted');s=trainingEvent(s,'confirm');assert.equal(s.index,2);
s=trainingEvent(s,'back');assert.equal(s.index,1);s=trainingEvent(s,'confirm');
s=trainingEvent(s,'confirm');assert.equal(s.index,3);s=trainingEvent(s,'followup');assert.equal(s.sample,1);
s=trainingEvent(s,'confirm');s=trainingEvent(s,'confirm');assert.equal(s.status,'complete');assert.ok(s.steps.every(x=>x.status==='confirmed'));
assert.throws(()=>trainingEvent(s,'play'));
assert.ok(trainingHandover(s).includes('No call or message has been sent'));
assert.ok(trainingHandover(s).includes('Fictional training note'));
assert.equal(trainingEvent(startTraining(),'end').status,'ended-early');
const scripts=JSON.parse(fs.readFileSync(new URL('./dist/api/voice-scripts.json',import.meta.url)));
for(const step of TRAINING.steps)assert.equal(scripts['medical-'+step.id],step.text);
class Element {
 constructor(){this.children=[];this.value='';this.textContent='';this.disabled=false;this.currentTime=0;this.attrs={};}
 append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}pause(){}load(){}async play(){}click(){}
}
const elements=new Map();globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement:()=>new Element(),addEventListener(){}};
globalThis.fetch=async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({nonce:'test',audio:btoa('test-audio')})});
const $=id=>document.getElementById(id);let completed=0;const ui=mountMedicalAssist({onComplete:()=>completed++});
assert.equal($('medicalConfirm').disabled,true);$('medicalStart').onclick();assert.equal($('medicalConfirm').disabled,false);
const initial=$('medicalStepTitle').textContent;await $('medicalPlay').onclick();$('medicalAudio').onended();assert.equal($('medicalStepTitle').textContent,initial);
$('medicalUnable').onclick();assert.equal($('medicalStepTitle').textContent,initial);
$('medicalConfirm').onclick();assert.match($('medicalStepTitle').textContent,/2 \/ 5/);
$('medicalConfirm').onclick();assert.match($('medicalStepTitle').textContent,/2 \/ 5/);
$('medicalContact').onchange({target:{value:'attempted'}});$('medicalConfirm').onclick();assert.match($('medicalStepTitle').textContent,/3 \/ 5/);
assert.equal(completed,0);$('medicalConfirm').onclick();$('medicalConfirm').onclick();$('medicalConfirm').onclick();assert.equal(completed,1);$('medicalConfirm').onclick();assert.equal(completed,1);
ui.clear();assert.equal($('medicalConfirm').disabled,true);assert.equal($('medicalExport').disabled,true);
const html=fs.readFileSync(new URL('./dist/index.html',import.meta.url),'utf8');const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const code=fs.readFileSync(new URL('./dist/medical-assist.mjs',import.meta.url),'utf8');for(const [,id]of code.matchAll(/(?:\$|put)\('([^']+)'/g))assert.ok(ids.includes(id),id);
assert.ok(!code.includes('fetch('));assert.ok(!code.includes('speechSynthesis'));assert.ok(!code.includes('getUserMedia'));
console.log('PASS: manual-only advancement, unable/back/contact gates, completion and early end, separate handover, audio metadata/scripts, UI controls and clearing; fixed cloud scripts and no microphone calls.');
