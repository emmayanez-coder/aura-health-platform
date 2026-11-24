import assert from 'node:assert/strict';
import {supportAlerts,mountHealthSupport} from './dist/health-support.mjs';
import {demoInput,scoreReadiness} from './dist/aura_score.mjs';
const now=Date.now();
const s={input:structuredClone(demoInput),result:scoreReadiness(demoInput),mode:'demo',missionDays:180};
assert.deepEqual(supportAlerts(s,now).map(a=>a.id),['sleep','mindfulness','activity','bone']);
s.mode='real';
assert.deepEqual(supportAlerts(s,now).map(a=>a.id),['activity','bone']);
s.assessment={demo:false,context:'resting',durationSeconds:300,measuredAt:new Date(now).toISOString(),quality:{hrCoverage:.9,rrCoverage:.9}};
assert.equal(supportAlerts(s,now).length,4);
s.assessment.quality.rrCoverage=.2;
assert.ok(!supportAlerts(s,now).some(a=>a.id==='mindfulness'));
s.assessment.measuredAt=new Date(now-86400000).toISOString();
assert.deepEqual(supportAlerts(s,now).map(a=>a.id),['activity','bone']);
s.assessment.measuredAt=new Date(now+1000).toISOString();
assert.equal(supportAlerts(s,now).length,2);
s.result.domains=[];s.missionDays=0;
assert.deepEqual(supportAlerts(s,now),[]);
console.log('PASS: four demo scenarios, missing/stale/future/poor-quality exclusions and no inferred bone-density alert.');
class Element {
  constructor(){this.children=[];this.value='';this.style={};this.open=false;}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  scrollIntoView(){} focus(){} setAttribute(){} addEventListener(){}
  showModal(){this.open=true;} close(){this.open=false;}
}
const ids=Object.fromEntries(['judgeCode','auraPortrait','alertHr','alertHrv','alertSpo2','alertSleep','alertActivity','alertDose','alertBone','alertDataNote','supportPreview','supportStatus','supportStop','supportList','supportApp','companionLog','aiQuestion','supportBell','supportCount','supportDialog','supportPosition','supportNext','supportClose'].map(id=>[id,new Element()]));
globalThis.document={getElementById:id=>ids[id],createElement:()=>new Element()};
let spoken=0,cancelled=0,selected='',opened=0;
globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
globalThis.Audio=class {set currentTime(value){throw new Error('Media not ready');} pause(){cancelled++;} play(){spoken++;return Promise.resolve();}};
globalThis.window={open(){opened++;}};
globalThis.fetch=async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({nonce:'test',audio:btoa('test-audio')})});
const ui=mountHealthSupport({selectAction:a=>selected=a});
const demo={input:structuredClone(demoInput),result:scoreReadiness(demoInput),mode:'demo',missionDays:180};
ui.update(demo);
assert.equal(ids.supportCount.textContent,'4');assert.equal(ids.supportDialog.open,false);assert.equal(spoken,0);
ids.supportBell.onclick();assert.equal(ids.supportDialog.open,true);assert.equal(ids.supportCount.textContent,'3');assert.equal(ids.supportList.children.length,1);
const click=label=>ids.supportList.children[0].children[4].children.find(b=>b.textContent===label).onclick();
await click('▶ Play recommendation');assert.equal(spoken,1);
ids.supportNext.onclick();assert.equal(ids.supportCount.textContent,'2');
click('Ask companion');assert.equal(ids.supportDialog.open,false);assert.match(ids.aiQuestion.value,/fictional demo/);
ids.supportBell.onclick();click('Use in reassessment');assert.equal(selected,'Review my approved exercise plan');assert.equal(ids.supportDialog.open,false);
ids.supportBell.onclick();click('Dismiss');assert.equal(ids.supportList.children.length,1);
ui.update(demo);assert.equal(spoken,1);
ui.clear();assert.equal(ids.supportDialog.open,false);assert.ok(cancelled>0);
console.log('PASS: red unread count, single-notification modal, manual playback, read tracking, companion/action handoff, dismiss and clear.');

const real={input:{...structuredClone(demoInput),eligible:{}},result:{domains:[],deviations:{}},mode:'real',missionDays:180};
ui.update(real);ids.supportBell.onclick();assert.equal(ids.supportPosition.textContent,'1 of 1');
ids.supportPreview.onclick();assert.equal(ids.supportPosition.textContent,'1 of 4');
const titles=[];
for(let i=0;i<4;i++){titles.push(ids.supportList.children[0].children[1].textContent);ids.supportNext.onclick();}
assert.equal(new Set(titles).size,4);
selected='';click('Use in reassessment');assert.equal(selected,'');
ui.update(real);assert.match(ids.supportPosition.textContent,/of 4/);
ids.supportPreview.onclick();assert.equal(ids.supportPosition.textContent,'1 of 1');
console.log('PASS: one real alert to four distinct preview scenarios, refresh isolation, preview reassessment blocked, and return to real alerts.');

ids.supportPreview.onclick();assert.equal(ids.alertHr.textContent,'72');assert.equal(ids.alertHrv.textContent,'32.0');assert.equal(ids.alertSleep.textContent,'6.5');
ids.supportPreview.onclick();assert.equal(ids.alertHr.textContent,'—');assert.equal(ids.alertHrv.textContent,'—');
console.log('PASS: fictional popup values and missing real assessment exclusions.');
