import {mountRewards} from './rewards.mjs?v=0.17';
import {mountAuraAvatar} from './aura-avatar.mjs?v=0.17';
import {mountMedicalAssist} from './medical-assist.mjs?v=0.17';
import {mountGuidance} from './guidance.mjs?v=0.17';
import {replayFlightCrew} from './flight-crew.mjs?v=0.4';
import {boneReference} from './bone-reference.mjs?v=0.3';
import {scoreReadiness, demoInput} from './aura_score.mjs';
import {KytoSensor} from './sensors/kyto.mjs';
import {HuaweiSensor} from './sensors/huawei.mjs';
import {SignalWindow} from './sensors/heart-rate.mjs';
import {makeBaseline, validateRecords, integrateRadiation} from './model.mjs';
import {integrateNasaRadiation} from './nasa-radiation.mjs?v=0.2';
const $ = id => document.getElementById(id);
const text = (id, value) => { $(id).textContent = value; };
const today = () => new Date().toLocaleDateString('en-CA');
const signal = new SignalWindow();
const rewards=mountRewards();
const medicalAssist=mountMedicalAssist({onComplete:id=>rewards.trainingCompleted(id)});
mountAuraAvatar();
let sensor = null, mode = 'real', connected = false, deviceKey = '', deviceName = '', brand = '', latest = null;
let records = [], events = [], assessment = null, capture = null, context = null, radiation = null;
let nasaDataset = null, nasaResult = null, radiationSelection = 'nasa';
$('historyDate').value = today();
const guidance=mountGuidance({log,onActionCompleted:(action,id)=>rewards.actionCompleted(action,id),getAssessment:()=>assessment,startAssessment:()=>{
  if(!connected||capture||mode==='demo'){notice('Connect your sensor and finish any active assessment first.',true);return;}
  $('assess').click();
}});

function notice(message, warning = false) { text('notice',message); $('notice').classList.toggle('warning',warning); }
function log(title, detail) {
  events.unshift({at:new Date().toISOString(),title,detail}); events = events.slice(0,60);
  $('timeline').replaceChildren(...events.map(e => {
    const li=document.createElement('li'), dot=document.createElement('span'), wrap=document.createElement('div'), b=document.createElement('b'), p=document.createElement('p');
    dot.className='timeline-dot'; b.textContent=e.title; p.textContent=new Date(e.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+' · '+e.detail;
    wrap.append(b,p);li.append(dot,wrap);return li;
  }));
}
function chart(id, values, color, labels, fixedRange = null, samples = null) {
  const width=500,height=65,pad=5, min=fixedRange?.[0] ?? Math.min(...values), max=fixedRange?.[1] ?? Math.max(...values);
  const timeSpan=samples?samples.at(-1).t-samples[0].t:0;
  const pts=values.map((v,i)=>[pad+(samples?(samples[i].t-samples[0].t)/Math.max(1,timeSpan):i/Math.max(1,values.length-1))*(width-2*pad),8+(max-v)/Math.max(.001,max-min)*35]);
  const line=pts.map(p=>p.join(',')).join(' '), fill=`${pad},48 ${line} ${width-pad},48`;
  // Only locally generated numeric coordinates and fixed UI colors enter SVG markup.
  $(id).innerHTML=`<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${id==='boneChart'?'Illustrative bone trajectory':'Cumulative environmental dose'}"><path d="M 5 45 H 495 M 5 25 H 495" stroke="#2a3b49" stroke-width=".6" fill="none"/><polygon points="${fill}" fill="${color}" opacity=".07"/><polyline points="${line}" stroke="${color}" stroke-width="2" fill="none"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="3" fill="${color}"/><text x="5" y="63"></text><text x="495" y="63" text-anchor="end"></text></svg>`;
  const nodes=$(id).querySelectorAll('text'); nodes[0].textContent=labels[0];nodes[1].textContent=labels[1];
  if(samples){
    const svg=$(id).querySelector('svg');svg.querySelector('polygon').remove();svg.querySelector('polyline').remove();
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',pts.map((p,i)=>(i===0||samples[i].breakBefore?'M':'L')+p.join(' ')).join(' '));
    path.setAttribute('fill','none');path.setAttribute('stroke',color);path.setAttribute('stroke-width','2');svg.append(path);
  }
}
function bone() {
  const result=boneReference(Number($('missionDays').value));
  text('daysLabel',result.days);
  text('bone',`${result.lower.toFixed(1)}–${result.upper.toFixed(1)}`);
  text('boneDetails',`Day ${result.days}: ${result.lossPercent.lower.toFixed(1)}–${result.lossPercent.upper.toFixed(1)}% modeled loss from indexed baseline. Shading spans two rate scenarios; it is not a confidence interval.`);
  const x=d=>40+d/180*420, y=v=>10+(100-v)/15*64;
  const points=key=>result.series.map(p=>`${x(p.day)},${y(p[key])}`);
  const lower=points('lower'), upper=points('upper');
  $('boneChart').innerHTML=`<svg viewBox="0 0 500 105" role="img" aria-label="NASA-sourced bone reference: ${result.lower.toFixed(1)} to ${result.upper.toFixed(1)} at day ${result.days}. Baseline index 100. Fixed axes zero to 180 days and index 85 to 100."><path d="M40 10H460 M40 53H460 M40 74H460" stroke="#2a3b49" fill="none"/><polygon points="${[...upper,...lower.slice().reverse()].join(' ')}" fill="#efa98f" opacity=".18"/><polyline points="${upper.join(' ')}" stroke="#80e2c4" stroke-width="2" fill="none"/><polyline points="${lower.join(' ')}" stroke="#efa98f" stroke-width="2" fill="none"/><text x="4" y="14">100</text><text x="10" y="57">90</text><text x="10" y="78">85</text><text x="40" y="100">DAY 0</text><text x="460" y="100" text-anchor="end">DAY 180</text></svg>`;
}
function renderRadiation() {
  if (!radiation) {text('dose','—');text('radiationBadge','AWAITING DATA');$('radiationChart').innerHTML='';text('radiationNote','Import a normalized dose-rate series. Environmental exposure is not personal effective dose.');return;}
  const isNasa=radiation.kind==='nasa-rad';
  text('dose',radiation.doseMGy.toFixed(3));text('radiationBadge',isNasa?'NASA RAD · HISTORICAL':radiation.demo?'DEMO SCENARIO':'USER-IMPORTED SERIES');
  chart('radiationChart',radiation.series.map(x=>x.value),'#80e2c4',[new Date(radiation.series[0].t).toISOString().slice(0,10)+' UTC',new Date(radiation.series.at(-1).t).toISOString().slice(0,10)+' UTC'],null,isNasa?radiation.series:null);
  text('radiationNote',isNasa?`Curiosity RAD · detector E (plastic). Estimated cumulative absorbed dose over ${radiation.coveredDays.toFixed(2)} covered days; ${radiation.coveragePercent.toFixed(1)}% of observation span. Gaps are not filled. Not your personal dose.`:`${radiation.source} · ${radiation.coveredDays.toFixed(1)} covered days · ${radiation.gaps} excluded gaps. Environmental absorbed dose; not personal effective dose.`);
  text('radiationDetails',isNasa?`${radiation.accepted} accepted / ${radiation.observations} observations · ${radiation.rejected} rejected · ${radiation.gaps} omitted intervals · mean over covered intervals ${radiation.meanDoseRateUGyPerDay.toFixed(1)} µGy/day.`:'Custom source: provenance is supplied by the uploader. NASA source documentation below describes only the bundled NASA dataset.');
}
async function loadNasa() {
  radiationSelection='nasa';$('loadNasa').disabled=true;
  try{
    if(!nasaDataset){
      const response=await fetch(new URL('./data/nasa-rad-20240101-20240107.json?v=0.2',import.meta.url));
      if(!response.ok)throw new Error('NASA data file could not be loaded. Upload the data folder and refresh.');
      nasaDataset=await response.json();
    }
    const result=integrateNasaRadiation(nasaDataset,$('radStart').value,$('radEnd').value);
    nasaResult=result;
    if(radiationSelection==='nasa'){radiation=result;renderRadiation();log('NASA radiation loaded',`${result.accepted} accepted observations; ${result.doseMGy.toFixed(3)} mGy covered-interval estimate.`);}
  }catch(error){text('radiationDetails',error.message);notice(error.message,true);}
  finally{$('loadNasa').disabled=false;}
}
$('loadNasa').onclick=loadNasa;
function refresh() {
  const now=Date.now(), demo=mode==='demo';
  rewards.setMode(mode);
  const baseline=demo?{...demoInput.baseline,hrvValidDays:14}:makeBaseline(records,deviceKey,now);
  const age=assessment?now-Date.parse(assessment.measuredAt):Infinity;
  const assessmentUsable=assessment && age>=0 && age<86400000 && assessment.deviceKey===deviceKey;
  const contextUsable=context?.date===today();
  let input=demo?structuredClone(demoInput):{
    baseline,
    eligible:{hr:!!assessmentUsable,hrv:!!assessmentUsable&&baseline.hrvValidDays>=7&&assessment.rmssdMs>0,sleep:!!contextUsable&&context.sleepHours!==null,activity:!!contextUsable&&context.completedUnits!==null&&context.plannedUnits>0},
    metrics:{hrBpm:assessmentUsable?assessment.hrBpm:null,rmssdMs:assessmentUsable?assessment.rmssdMs:null,sleepHours:context?.sleepHours,sleepTargetHours:context?.sleepTargetHours,completedUnits:context?.completedUnits,plannedUnits:context?.plannedUnits},
    reasons:{hr:'No current five-minute resting assessment',hrv:brand==='Huawei'?'Huawei broadcast is HR-only':'Matching RMSSD baseline/measurement unavailable',sleep:'No context for today',activity:'No current exercise plan entry'}
  };
  const result=scoreReadiness(input);
  text('vitalsDose',$('dose').textContent);
  text('vitalsBone',$('bone').textContent);
  guidance.update({input,result,assessment,mode,spo2:contextUsable?context?.spo2:null,radiationDose:radiation?.doseMGy,boneIndex:$('bone').textContent,missionDays:Number($('missionDays').value)});
  text('mode',demo?'DEMONSTRATION · SYNTHETIC DATA':connected?'REAL SENSOR MODE':'REAL MODE · NO SENSOR');
  text('score',result.score??'—');$('ring').style.background=`conic-gradient(var(--teal) ${(result.score||0)*3.6}deg,#293b48 0deg)`;
  text('state',result.score===null?(baseline.validDays<7?'Building your baseline':'More context needed'):result.band);
  text('scoreDescription',demo?'Synthetic example · all four domains':result.score!==null?`${result.status==='PARTIAL'?'Partial':'Full'} readiness · ${result.domains.length} contributing domains`:'Add a valid resting assessment, sleep and sufficient context.');
  text('coverage',result.coveragePercent+'%');$('coverageBar').style.width=result.coveragePercent+'%';
  text('assessmentAge',demo?'DEMO · illustrative personal baseline':assessment?`Resting assessment: ${new Date(assessment.measuredAt).toLocaleString()}${assessmentUsable?'':' · not eligible'}`:'No resting assessment yet');
  $('components').replaceChildren(...[['hr','Resting HR'],['hrv','RMSSD'],['sleep','Sleep'],['activity','Exercise']].map(([key,label])=>{
    const el=document.createElement('div');el.className='component';const name=document.createElement('span'),value=document.createElement('b'),track=document.createElement('div'),bar=document.createElement('i');
    name.textContent=label;value.textContent=result.components[key]===undefined?'—':Math.round(result.components[key]);track.className='track';bar.style.width=(result.components[key]??0)+'%';track.append(bar);el.append(name,value,track);el.title=result.excluded[key]||`${label} component, prototype points`;return el;
  }));
  const reasons=[];
  if (result.domains.includes('hr')) {const delta=input.metrics.hrBpm-baseline.hrMedian;reasons.push(`Resting HR ${Math.abs(delta).toFixed(1)} BPM ${delta>=0?'above':'below'} reference`);}
  if (result.domains.includes('hrv')) {const delta=100*(input.metrics.rmssdMs/Math.exp(baseline.logRmssdMedian)-1);reasons.push(`RMSSD ${Math.abs(delta).toFixed(0)}% ${delta>=0?'above':'below'} reference`);}
  if (result.domains.includes('sleep')) reasons.push(`Sleep ${input.metrics.sleepHours} of ${input.metrics.sleepTargetHours} target hours`);
  text('explanation',reasons.length?reasons.join('. ')+'. '+(demo?'Demonstration only. ':result.status==='PARTIAL'?'Partial coverage; compare only with the same domains. ':'')+'This index does not identify a medical cause.':'AURA needs comparable resting observations across at least seven prior days. Live readings remain visible while your personal baseline grows.');
  text('baselineDays',baseline.validDays);
  const fresh=latest && connected && now-latest.receivedAt<=5000;
  const summary=signal.summary(now);
  text('hr',demo?'72':fresh?latest.hr:'—');text('hrMeta',demo?'DEMO · synthetic reading':fresh?`${deviceName} · ${Math.floor((now-latest.receivedAt)/1000)}s ago`:latest?'Signal stale / disconnected':'No live measurement');
  text('hrv',demo?'32':fresh&&summary.rmssd!==null&&brand!=='Huawei'?summary.rmssd.toFixed(1):'—');
  text('hrvMeta',demo?'DEMO · synthetic RMSSD':brand==='Huawei'?'Unavailable · HR-only broadcast':summary.rmssd!==null&&fresh?'Derived · 60s RR window':`Collecting valid intervals · ${Math.round(summary.rrCoverage*100)}% of 60s`);
  text('sleep',demo?'6.5':contextUsable&&context.sleepHours!==null?context.sleepHours:'—');text('sleepMeta',demo?'DEMO · target 8 h':contextUsable?'Manual entry · '+context.date:'Previous sleep period');
  const adherence=contextUsable&&context.completedUnits!==null&&context.plannedUnits>0?Math.min(100,100*context.completedUnits/context.plannedUnits):null;
  text('activity',demo?'80':adherence!==null?Math.round(adherence):'—');text('activityMeta',demo?'DEMO · 4 of 5 plan units':contextUsable?'Manual entry · prescribed plan':'Against the prescribed plan');
  text('spo2',demo?'98':contextUsable&&context.spo2!==null?context.spo2:'—');text('spo2Meta',demo?'DEMO · excluded from score':contextUsable&&context.spo2!==null?'Manual history · not live':'Optional history / manual input');
  if(capture){const elapsed=(now-capture.started)/1000;$('progress').value=Math.min(300,elapsed);text('assessmentStatus',`Resting assessment · ${Math.min(300,Math.floor(elapsed))} / 300 seconds. Keep this tab visible.`);if(elapsed>=300)finishAssessment(now);}
  $('assess').disabled=!connected||!!capture||demo;
  $('saveAssessment').disabled=!assessment||demo;
}
function leaveDemo() {
  if(mode!=='demo')return;
  mode='real';assessment=null;context=null;signal.clear();latest=null;deviceKey='';
  renderRadiation();log('Real data mode','Synthetic readings and demo baseline removed.');
}
async function connect(kind) {
  leaveDemo();sensor?.disconnect();signal.clear();latest=null;assessment=null;capture=null;deviceKey='';brand=kind;
  $('kyto').disabled=$('huawei').disabled=true;
  text('connection','SELECT A SENSOR');notice('Select your '+kind+' in the browser Bluetooth chooser.');
  const options={encoding:$('encoding').value,onReading:packet=>{
    if(signal.add(packet,packet.receivedAt)){latest=packet;deviceKey=packet.deviceKey;deviceName=packet.deviceName;}
    else latest=null;
    refresh();
  },onStatus:(state,message)=>{
    if(state==='packet-error'){signal.interrupt();latest=null;text('sensorHelp','Packet rejected: '+message);return;}
    connected=state==='connected';text('connection',connected?'CONNECTED · '+kind.toUpperCase():'DISCONNECTED');
    if(!connected){signal.interrupt();latest=null;if(capture){capture=null;text('assessmentStatus','Assessment interrupted. Start again after reconnecting.');}}
    if(connected){log(kind+' connected',message);notice('Live measurements are local to this browser. Start a resting assessment when ready.');}
    refresh();
  }};
  sensor=kind==='Kyto'?new KytoSensor(options):new HuaweiSensor(options);
  try{await sensor.connect();}catch(e){notice(e.message,true);log('Connection not completed',e.message);text('connection','DISCONNECTED');}
  finally{$('kyto').disabled=$('huawei').disabled=false;refresh();}
}
function finishAssessment(now) {
  const run=capture;capture=null;
  const summary=signal.summary(now,300,run.started);
  if(summary.hr===null){text('assessmentStatus','Assessment not saved: insufficient fresh HR coverage. Please repeat.');log('Assessment incomplete','Insufficient HR coverage; no readiness measurement created.');return;}
  assessment={deviceKey,deviceName,measuredAt:new Date(now).toISOString(),durationSeconds:300,context:'resting',demo:false,hrBpm:summary.hr,rmssdMs:brand==='Huawei'?null:summary.rmssd,quality:{hrCoverage:summary.hrCoverage,rrCoverage:summary.rrCoverage,rejected:summary.rejected},rrEncoding:brand==='Kyto'?$('encoding').value:'bluetooth'};
  text('assessmentStatus',`Assessment complete · HR ${summary.hr.toFixed(1)} BPM${assessment.rmssdMs!==null?' · RMSSD '+assessment.rmssdMs.toFixed(1)+' ms':' · HRV unavailable'}. Add to your record to retain it.`);
  log('Resting assessment complete','Five-minute observation ready for scoring and export.');refresh();
}
$('kyto').onclick=()=>connect('Kyto');$('huawei').onclick=()=>connect('Huawei');
$('disconnect').onclick=()=>{sensor?.disconnect();connected=false;latest=null;capture=null;signal.clear();refresh();};
$('encoding').onchange=()=>{if(connected){sensor.disconnect();signal.clear();latest=null;assessment=null;deviceKey='';notice('Interval format changed. Reconnect Kyto before measuring.');refresh();}};
$('assess').onclick=()=>{
  if(!$('resting').checked){notice('Confirm that you are resting and breathing naturally before starting.',true);return;}
  if(!latest||Date.now()-latest.receivedAt>5000){notice('Wait for a fresh sensor reading before starting.',true);return;}
  signal.clear();assessment=null;capture={started:Date.now()};$('progress').value=0;log('Resting assessment started','Five minutes, seated, natural breathing.');refresh();
};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&capture){capture=null;signal.interrupt();text('assessmentStatus','Assessment cancelled because the tab was hidden. Keep AURA visible and restart.');log('Assessment interrupted','Tab hidden; no incomplete observation scored.');}});
$('saveAssessment').onclick=()=>{
  if(!assessment||mode==='demo')return;
  if(!records.some(r=>r.measuredAt===assessment.measuredAt&&r.deviceKey===assessment.deviceKey))records.push(structuredClone(assessment));
  notice('Assessment added in memory. Export your record before closing this page.');log('Assessment added to record',`${records.length} recorded observations. Prior days contribute to future baselines.`);refresh();
};
$('baselineFile').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>3000000)throw new Error('Record file must be below 3 MB');
    const data=JSON.parse(await file.text());if(data.schema!=='aura-record-v1')throw new Error('Expected an AURA record export');
    const incoming=validateRecords(data.records);leaveDemo();
    const merged=new Map([...records,...incoming].map(r=>[r.deviceKey+'|'+r.measuredAt,r]));records=[...merged.values()];
    log('Record imported',`${incoming.length} resting observations. Baseline requires the same device/browser identity.`);notice('Record imported. Connect the matching sensor to calculate its baseline.');refresh();
  }catch(error){notice(error.message,true);}e.target.value='';
};
$('historyForm').onsubmit=e=>{
  e.preventDefault();leaveDemo();
  const num=id=>$(id).value===''?null:Number($(id).value);
  context={date:$('historyDate').value,sleepHours:num('sleepInput'),sleepTargetHours:num('sleepTarget'),completedUnits:num('completed'),plannedUnits:num('planned'),spo2:num('spo2Input'),source:'manual wearable history',enteredAt:new Date().toISOString()};
  log('Daily context updated','Manual wearable-history entry for '+context.date);notice(context.date===today()?'Daily context applied. Missing values stay unavailable.':'Saved context is not dated today, so it will not enter today’s readiness.');refresh();
};
$('radiationFile').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(!$('radiationSource').value.trim())throw new Error('Enter the source, detector/material and preprocessing description first');
    if(file.size>3000000)throw new Error('Radiation file must be below 3 MB');
    const parsed=integrateRadiation(await file.text());leaveDemo();radiationSelection='custom';radiation={...parsed,source:$('radiationSource').value.trim(),demo:false};renderRadiation();log('Radiation series imported',file.name+' · environmental absorbed dose');notice('Imported environmental dose series. Its source label is user-supplied, not independently verified.');refresh();
  }catch(error){notice(error.message,true);}e.target.value='';
};
$('missionDays').oninput=bone;
$('demo').onclick=()=>{
  sensor?.disconnect();sensor=null;connected=false;capture=null;latest=null;signal.clear();mode='demo';
  notice('DEMO: Daily Readiness and vitals are synthetic. Radiation retains its separately labeled historical NASA or imported source; bone retains its NASA-sourced research reference.');
  log('Demonstration opened','Synthetic physiology only. Radiation provenance stays separate. Personal records are retained.');renderRadiation();refresh();
};
$('clear').onclick=()=>{
  sensor?.disconnect();sensor=null;mode='real';connected=false;records=[];assessment=null;capture=null;context=null;radiation=nasaResult;radiationSelection='nasa';events=[];latest=null;deviceKey='';brand='';signal.clear();
  guidance.clear();medicalAssist.clear();rewards.clear();
  $('historyForm').reset();$('historyDate').value=today();$('progress').value=0;text('assessmentStatus','Live RMSSD uses a separate 60-second window.');
  log('Data cleared','In-memory measurements and history removed. Existing exported files are unchanged.');notice('Ready for a new session.');renderRadiation();refresh();
};
$('export').onclick=()=>{
  const data={schema:'aura-record-v1',exportedAt:new Date().toISOString(),displayMode:mode,records,latestRestingAssessment:mode==='demo'?null:assessment,dailyContext:mode==='demo'?null:context,radiation,boneReference:boneReference(Number($('missionDays').value)),reassessmentLoops:guidance.export(),actionRewards:rewards.export(),events};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='AURA-record-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  notice('Record exported. Keep this health-data file in a private location.');
};
bone();renderRadiation();refresh();loadNasa();setInterval(refresh,1000);

let flightReport=null;
$('runFlight').onclick=async()=>{
  $('runFlight').disabled=true; $('exportFlight').disabled=true;
  flightReport=null; $('flightMetrics').replaceChildren();
  text('flightStatus','Loading and processing the NASA ECG excerpt…');
  try {
    const response=await fetch(new URL('./data/flight-crew-ecg.json?v=0.4',import.meta.url));
    if(!response.ok) throw new Error('ECG excerpt not found. Upload the data folder.');
    const data=await response.json();
    flightReport=replayFlightCrew(data);
    const s=flightReport.summary, display=(n,unit)=>n===null?'Unavailable':n.toFixed(1)+' '+unit;
    const metrics=[['Detected candidate beats',flightReport.peakCount],['5-minute HR estimate',display(s.hr,'BPM')],['5-minute RMSSD estimate',display(s.rmssd,'ms')],['HR coverage',(100*s.hrCoverage).toFixed(1)+'%'],['RR coverage',(100*s.rrCoverage).toFixed(1)+'%'],['Rejected items',s.rejected]];
    $('flightMetrics').replaceChildren(...metrics.map(([label,value])=>{const el=document.createElement('div'), b=document.createElement('b'), span=document.createElement('span');b.textContent=value;span.textContent=label;el.append(b,span);return el;}));
    text('flightStatus',`Replay completed · ${data.provenance.member} · ${data.samples.length.toLocaleString()} ECG samples · ${data.provenance.startSeconds}–${data.provenance.endSeconds} seconds. ${s.hr===null||s.rmssd===null?'QUALITY GATE: insufficient coverage; HR/RMSSD estimates are withheld where unavailable. At least 80% coverage is required. ':''}Completion is not an accuracy validation. Rejected-item count covers the full excerpt.`);
    $('exportFlight').disabled=false;
  } catch(error) {text('flightStatus','Test unavailable: '+error.message);}
  finally {$('runFlight').disabled=false;}
};
$('exportFlight').onclick=()=>{
  if(!flightReport)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(flightReport,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='AURA-NASA-flight-crew-test.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
