import {mountHealthSupport} from './health-support.mjs?v=0.17';
import {mountCloudChat} from './cloud-chat.mjs?v=0.17';
export function interpret(input,result) {
  const facts=[],m=input.metrics,b=input.baseline;
  if(result.domains.includes('hr')) facts.push(`Resting HR ${m.hrBpm.toFixed(1)} BPM; personal reference ${b.hrMedian.toFixed(1)} BPM (${b.validDays} prior days).`);
  if(result.domains.includes('hrv')) facts.push(`RMSSD ${m.rmssdMs.toFixed(1)} ms; reference ${Math.exp(b.logRmssdMedian).toFixed(1)} ms.`);
  if(result.domains.includes('sleep')) facts.push(`Recorded sleep ${m.sleepHours} h; target ${m.sleepTargetHours} h.`);
  const changed=result.deviations.hrZ>1 || result.deviations.hrvZ< -1 || (result.domains.includes('sleep')&&m.sleepHours<m.sleepTargetHours);
  return {
    title:result.score===null?'More information needed':changed?'Review changes in your routine':'Review your current measurements',
    facts,
    explanation:result.score===null?'AURA cannot provide a complete readiness interpretation yet. Missing data does not mean poor health.':`${result.coveragePercent}% weighted data coverage. These readings describe differences from your reference and targets; they do not identify a medical cause or establish fitness for duty.`,
    action:result.score===null?'Check sensor contact, collect a five-minute resting assessment, and add dated sleep/activity context. A baseline needs at least seven prior days.':'Review recent sleep, activity and how you feel. Follow your existing crew-approved routine; record the action you choose and repeat a comparable resting assessment when appropriate.',
    missing:Object.entries(result.excluded).map(([k,v])=>`${k}: ${v}`)
  };
}
export function usableAssessment(a,now) {
  const age=now-Date.parse(a?.measuredAt);
  return !!a && a.demo===false && a.context==='resting' && a.durationSeconds===300 && Number.isFinite(a.hrBpm) && a.hrBpm>=35 && a.hrBpm<=220 && typeof a.deviceKey==='string' && !!a.deviceKey && a.quality?.hrCoverage>=.8 && age>=0 && age<86400000;
}
export function compareFollowup(loop,a,now=Date.now()) {
  if(loop?.status!=='awaiting') throw new Error('Complete the recorded action before reassessing.');
  if(!usableAssessment(a,now)) throw new Error('A fresh, valid five-minute resting assessment is required.');
  if(a.deviceKey!==loop.before.deviceKey || a.rrEncoding!==loop.before.rrEncoding) throw new Error('Use the same sensor and interval format as the first assessment.');
  if(Date.parse(a.measuredAt)-300000<Date.parse(loop.completedAt)) throw new Error('Start a new five-minute assessment after marking the action complete.');
  const hrvValid=x=>Number.isFinite(x.rmssdMs)&&x.rmssdMs>0&&x.quality?.rrCoverage>=.8;
  return {hrDeltaBpm:a.hrBpm-loop.before.hrBpm,rmssdDeltaMs:hrvValid(a)&&hrvValid(loop.before)?a.rmssdMs-loop.before.rmssdMs:null,note:'Observed change only. This comparison does not prove that the action caused a change or that health improved. Sleep/activity context and baseline are preserved with the original snapshot; scores are not compared.'};
}

export function mountGuidance({log,getAssessment,startAssessment,onActionCompleted=()=>{}}) {
  const $=id=>document.getElementById(id),put=(id,v)=>$(id).textContent=v;
  let state=null,loops=[],active=null;
  const cloud=mountCloudChat(()=>state?{state,loop:active||loops.at(-1)}:null);
  const support=mountHealthSupport({selectAction(action){
    if(active){put('loopStatus','Finish or cancel the current action before selecting another.');return;}
    $('actionChoice').value=action;
    $('beginLoop').scrollIntoView({behavior:'smooth',block:'center'});
  }});
  const tell=message=>put('loopStatus',message);
  function render() {
    if(!state)return;
    cloud.update(state.mode);
    support.update(state);
    const view=interpret(state.input,state.result),demo=state.mode==='demo';
    put('interpretTitle',(demo?'DEMO · ':'')+view.title);
    put('interpretFacts',view.facts.join(' ')||'No comparable personal measurements yet.');
    put('interpretMeaning',view.explanation);
    put('interpretAction',view.action);
    put('interpretMissing',view.missing.length?'Missing/excluded: '+view.missing.join(' · '):'All four readiness domains available.');
    put('interpretTime',demo?'Synthetic example · cannot create a personal follow-up':state.assessment?`Assessment: ${new Date(state.assessment.measuredAt).toLocaleString()} · ${state.assessment.deviceName||'sensor'}`:'No completed resting assessment.');
    $('beginLoop').disabled=demo||!!active||!usableAssessment(state.assessment,Date.now());
    $('completeAction').disabled=demo||active?.status!=='action';
    $('repeatAssessment').disabled=demo||active?.status!=='awaiting';
    $('finishLoop').disabled=demo||active?.status!=='awaiting';
    $('cancelLoop').disabled=!active;
    $('actionChoice').disabled=!!active;
  }
  function record(stage) {log('Reassessment · '+stage,active.action);render();}
  $('beginLoop').onclick=()=>{
    const a=getAssessment();
    if(state.mode==='demo'||active||!usableAssessment(a,Date.now()))return;
    active={id:crypto.randomUUID(),status:'action',startedAt:new Date().toISOString(),action:$('actionChoice').value,before:structuredClone(a),baseline:structuredClone(state.input.baseline),context:structuredClone(state.input.metrics),readiness:structuredClone(state.result),beforeNote:$('feelingNote').value.trim().slice(0,500)};
    loops.push(active);$('feelingNote').value='';put('loopComparison','');
    tell('1/3 · Action recorded. Carry it out according to your existing plan, then mark it complete.');record('started');
  };
  $('completeAction').onclick=()=>{
    if(state.mode==='demo'||active?.status!=='action')return;
    active.completedAt=new Date().toISOString();active.status='awaiting';
    onActionCompleted(active.action,active.id);
    tell('2/3 · Action complete. When appropriate, use the same sensor, rest naturally, and collect a NEW five-minute assessment.');record('action complete');
  };
  $('repeatAssessment').onclick=()=>{
    if(state.mode==='demo'||active?.status!=='awaiting')return;
    document.getElementById('data').scrollIntoView({behavior:'smooth'});
    startAssessment();
  };
  $('finishLoop').onclick=()=>{
    if(state.mode==='demo')return;
    try {
      const a=getAssessment(),comparison=compareFollowup(active,a);
      active.after=structuredClone(a);active.comparison=comparison;active.afterNote=$('feelingNote').value.trim().slice(0,500);active.status='complete';active.finishedAt=new Date().toISOString();
      put('loopComparison',`Resting HR: ${active.before.hrBpm.toFixed(1)} → ${a.hrBpm.toFixed(1)} BPM (${comparison.hrDeltaBpm>=0?'+':''}${comparison.hrDeltaBpm.toFixed(1)}). RMSSD: ${comparison.rmssdDeltaMs===null?'not comparable':`${active.before.rmssdMs.toFixed(1)} → ${a.rmssdMs.toFixed(1)} ms`}. ${comparison.note}`);
      tell('3/3 · Follow-up recorded. Export your record to retain both measurements, notes and the action.');
      record('completed');active=null;$('feelingNote').value='';render();
    } catch(e){tell(e.message);}
  };
  $('cancelLoop').onclick=()=>{
    if(!active)return;active.status='cancelled';active.finishedAt=new Date().toISOString();record('cancelled');active=null;tell('Loop cancelled. Its history remains in your export.');render();
  };
  function chat(topic,label) {
    if(!state)return;
    const v=interpret(state.input,state.result);
    const answers={
      explain:[v.title,...v.facts,v.explanation,...v.missing].join(' '),
      next:v.action+' The action log records your choice; it does not prescribe treatment or change your exercise plan.',
      reassess:active?`Current step: ${active.status==='action'?'Complete the action you recorded.':'Collect a new five-minute resting assessment after action completion.'} Use the same sensor and interval format. Return here and choose Compare new assessment. A numerical change does not prove recovery.`:'First collect a valid five-minute resting assessment. Then record an action, mark it complete, repeat the assessment under comparable conditions, and compare. No required recovery duration is inferred by AURA.',
      evidence:'The NASA ECG excerpt tests the processing pipeline; it is not your ECG. It failed the coverage gate and supplies no personal readiness evidence. Radiation is historical Mars data; the bone curve is a research scenario. See Evidence & Testing and NASA sources.',
      help:'I cannot diagnose symptoms, recommend medication or determine whether you are safe. For a medical concern, contact your crew medical officer or medical support and use your approved mission procedure. Do not delay help to finish a score or reassessment. Emergency detection and treatment procedures are not implemented.'
    };
    const row=document.createElement('div'),q=document.createElement('b'),a=document.createElement('p');q.textContent=label;a.textContent=(state.mode==='demo'?'DEMO · Synthetic readings. ':'')+answers[topic];row.append(q,a);$('companionLog').append(row);
    while($('companionLog').children.length>8)$('companionLog').firstElementChild.remove();
    row.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  for(const button of document.querySelectorAll('[data-topic]'))button.onclick=()=>chat(button.dataset.topic,button.textContent);
  return {
    update(value){state=value;render();},
    export(){return structuredClone(loops);},
    clear(){support.clear();cloud.clear();loops=[];active=null;$('companionLog').replaceChildren();put('loopComparison','');$('feelingNote').value='';tell('No follow-up started.');render();}
  };
}
