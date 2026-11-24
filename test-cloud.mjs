import assert from 'node:assert/strict';
import fs from 'node:fs';
import {healthSnapshot,mountCloudChat} from './dist/cloud-chat.mjs';
import {scoreReadiness,demoInput} from './dist/aura_score.mjs';
const now=Date.now();
const state={mode:'real',input:{...structuredClone(demoInput),baseline:{...demoInput.baseline,hrvValidDays:14}},result:scoreReadiness(demoInput),assessment:{demo:false,measuredAt:new Date(now).toISOString(),hrBpm:70,rmssdMs:35,deviceKey:'SECRET_DEVICE',quality:{hrCoverage:.9,rrCoverage:.9}},notes:'SECRET_NOTE'};
let snapshot=healthSnapshot(state,{status:'complete',comparison:{hrDeltaBpm:-2,rmssdDeltaMs:3},beforeNote:'SECRET_NOTE'},now);
assert.equal(snapshot.hrBpm,70);assert.equal(snapshot.hrChange,-2);
assert.ok(!JSON.stringify(snapshot).includes('SECRET'));
assert.equal(healthSnapshot({...state,assessment:{...state.assessment,measuredAt:new Date(now-86400000).toISOString()}},null,now).hrBpm,null);
assert.equal(healthSnapshot({...state,assessment:{...state.assessment,quality:{hrCoverage:.9,rrCoverage:.5}}},null,now).rmssdMs,null);
assert.equal(healthSnapshot({...state,mode:'demo'},null,now).mode,'demo');
assert.equal(healthSnapshot({...state,input:{...state.input,eligible:{}}},null,now).sleepHours,null);
// DOM event integration with a minimal test-only DOM. No browser rendering claims.
class Element {constructor(){this.children=[];this.value='';this.checked=false;this.textContent='';this.disabled=false;}append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}scrollIntoView(){} get firstElementChild(){return {remove:()=>this.children.shift()};}}
globalThis.Audio=class {pause(){} play(){return Promise.resolve();}};
const elements=new Map();globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement:()=>new Element()};
const $=id=>document.getElementById(id);let requests=[];
globalThis.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,headers:{get:()=> 'application/json'},json:async()=>options.method==='POST'?{answer:'Your HR is 70 BPM.'}:{nonce:'test-nonce'}};};
const chat=mountCloudChat(()=>({state,loop:null}));chat.update('real');
$('aiQuestion').value='What is my HR?';await $('aiForm').onsubmit({preventDefault(){}});assert.equal(requests.length,0,'Consent required');
$('judgeCode').value='test-only-judge-code-never-deploy';$('aiConsent').checked=true;await $('aiForm').onsubmit({preventDefault(){}});
assert.equal(requests.length,2);assert.equal(requests[0].options.headers['X-AURA-Access-Code'],undefined);assert.equal(requests[1].options.headers['X-AURA-Access-Code'],undefined);assert.ok(!requests[1].options.body.includes('test-only-judge-code'));let sent=JSON.parse(requests[1].options.body);assert.equal(sent.snapshot.hrBpm,70);assert.equal(sent.history.length,0);assert.ok(!JSON.stringify(sent).includes('SECRET'));
$('aiQuestion').value='And compared with my baseline?';await $('aiForm').onsubmit({preventDefault(){}});sent=JSON.parse(requests[3].options.body);assert.equal(sent.history.length,2);
chat.update('demo');assert.equal($('aiConsent').checked,false);assert.equal($('aiLog').children.length,0);
chat.clear();assert.equal($('aiQuestion').value,'');
const html=fs.readFileSync(new URL('./dist/index.html',import.meta.url),'utf8');const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const code=fs.readFileSync(new URL('./dist/cloud-chat.mjs',import.meta.url),'utf8');for(const [,id]of code.matchAll(/\$\('([^']+)'/g))assert.ok(ids.includes(id),'Missing '+id);
console.log('PASS: snapshot whitelist, stale/low-quality exclusion, consent gate, actual form POST/history, mode reset, clearing and UI references.');
