import {playNaturalVoice,stopNaturalVoice} from './natural-voice.mjs?v=0.17';
import {demoInput,scoreReadiness} from './aura_score.mjs';
// Prototype wellness rules, not validated clinical thresholds or emergency detection.
export function supportAlerts(state, now=Date.now()) {
  const {input,result,assessment:a,mode}=state, m=input.metrics, d=result.deviations;
  const demo=mode==='demo', age=now-Date.parse(a?.measuredAt);
  const valid=demo || (a?.demo===false && a.context==='resting' && a.durationSeconds===300 && age>=0 && age<86400000 && a.quality?.hrCoverage>=.8);
  const hr=valid&&result.domains.includes('hr')&&d.hrZ>1;
  const hrv=valid&&(demo||a?.quality?.rrCoverage>=.8)&&result.domains.includes('hrv')&&d.hrvZ< -1;
  const alerts=[];
  const add=(id,title,message,evidence,action)=>alerts.push({id,title,message,evidence,action,demo});
  if(hr&&result.domains.includes('sleep')&&m.sleepHours<m.sleepTargetHours)
    add('sleep','Prioritize rest','Your sleep was shorter than your target and resting heart rate is above your reference. Consider your scheduled rest routine and reassess when appropriate.',`${m.sleepHours} h sleep / ${m.sleepTargetHours} h target; resting HR ${m.hrBpm.toFixed(1)} / ${input.baseline.hrMedian.toFixed(1)} BPM reference.`, 'Follow my existing scheduled recovery/rest routine');
  if(hr&&hrv)
    add('mindfulness','Consider a mindfulness session','Resting heart rate is higher and HRV lower than your reference. This does not establish stress or its cause. If you feel well, a brief mindfulness session may be helpful.',`HR ${m.hrBpm.toFixed(1)} BPM; RMSSD ${m.rmssdMs.toFixed(1)} ms / ${Math.exp(input.baseline.logRmssdMedian).toFixed(1)} ms reference.`, 'Complete an optional mindfulness session');
  if(result.domains.includes('activity')&&m.completedUnits<m.plannedUnits)
    add('activity','Review your activity plan','Recorded activity is below your plan. Check for missing entries and follow your existing approved plan; do not increase intensity based on this alert.',`${m.completedUnits} / ${m.plannedUnits} planned units recorded today. This may be an unfinished day.`, 'Review my approved exercise plan');
  if(Number.isFinite(state.missionDays)&&state.missionDays>0)
    add('bone','Bone-health countermeasure reminder','The mission model highlights the importance of bone-health countermeasures. It does not measure your bone density. Review adherence to your prescribed exercise plan.',`Modeled mission day ${state.missionDays}; NASA research context, not a personal bone measurement.`, 'Review my approved exercise plan');
  return alerts;
}

export function mountHealthSupport({selectAction}) {
  const $=id=>document.getElementById(id), dismissed=new Set(), read=new Set();
  let state, alerts=[], currentId=null, signature='', lastMode;
  const player=new Audio();
  player.preload='none';
  const stopAudio=()=>stopNaturalVoice();
  const status=t=>{$('supportStatus').textContent=t;};
  let preview=false;
  const previewDismissed=new Set(),previewRead=new Set();
  const previewInput=structuredClone(demoInput);
  const previewAlerts=supportAlerts({input:previewInput,result:scoreReadiness(previewInput),mode:'demo',missionDays:180});
  const dismissedSet=()=>preview?previewDismissed:dismissed;
  const readSet=()=>preview?previewRead:read;
  const visible=()=>(preview?previewAlerts:alerts).filter(a=>!dismissedSet().has(a.id));
  $('supportPreview').onclick=()=>{
    stopAudio();preview=!preview;currentId=null;
    previewDismissed.clear();previewRead.clear();
    $('supportPreview').textContent=preview?'Return to current data':'Preview all 4 scenarios';
    status(preview?'Four fictional scenarios loaded. Your sensor data and personal record are unchanged.':'Showing alerts from current dashboard data.');
    render();
  };
  function close(){stopAudio();$('supportDialog').close();$('supportBell').focus();}
  function speak(a){return playNaturalVoice({kind:'script',scriptId:'alert-'+a.id,player,status});}
  function badge(){
    const items=visible(), unread=items.filter(a=>!readSet().has(a.id)).length;
    $('supportCount').textContent=String(unread);
    $('supportCount').hidden=unread===0;
    $('supportBell').className='support-bell '+(unread?'unread':items.length?'reviewed':'empty');
    $('supportBell').setAttribute('aria-label',`${unread} unread health support notifications. ${items.length} available. Open notifications`);
    $('supportBell').title=unread?'New health support notification':'Health support notifications';
  }
  function renderPhysiology(){
    if(!state)return;
    const fictional=preview||state.mode==='demo', input=fictional?previewInput:state.input,m=input.metrics;
    const a=state.assessment,age=Date.now()-Date.parse(a?.measuredAt);
    const valid=fictional||(a?.demo===false&&a.context==='resting'&&a.durationSeconds===300&&age>=0&&age<86400000&&a.quality?.hrCoverage>=.8);
    const put=(id,value,digits=0)=>{$(id).textContent=Number.isFinite(value)?value.toFixed(digits):'—';};
    put('alertHr',valid?m.hrBpm:null);
    put('alertHrv',valid&&(fictional||a.quality?.rrCoverage>=.8)?m.rmssdMs:null,1);
    put('alertSpo2',fictional?98:state.spo2);
    put('alertSleep',input.eligible.sleep?m.sleepHours:null,1);
    put('alertActivity',input.eligible.activity&&m.plannedUnits>0?Math.min(100,100*m.completedUnits/m.plannedUnits):null);
    put('alertDose',state.radiationDose,3);
    $('alertBone').textContent=state.boneIndex||'—';
    $('alertDataNote').textContent=fictional?'FICTIONAL PHYSIOLOGY · Radiation and bone remain separate mission references. Circles are not risk scores.':`HR/HRV: ${valid?'completed resting assessment '+a.measuredAt:'no valid completed resting assessment'}. Sleep, activity and oxygen are recorded context. Radiation is environmental; bone is modeled. Main dashboard shows live sensor readings.`;
  }
  function render(){
    renderPhysiology();
    const items=visible();
    let a=items.find(x=>x.id===currentId)||items.find(x=>!readSet().has(x.id))||items[0];
    currentId=a?.id||null;
    if($('supportDialog').open&&a)readSet().add(a.id);
    badge();$('supportList').replaceChildren();
    $('supportPosition').textContent=a?`${items.indexOf(a)+1} of ${items.length}`:'No active notifications';
    $('supportNext').disabled=items.length<2;
    $('supportNext').textContent=items.length<2?'No other notifications':'Next notification →';
    if(!a){const p=document.createElement('p');p.textContent='No active support notifications from eligible data. Missing data does not establish good health.';$('supportList').append(p);return;}
    const card=document.createElement('article');
    const source=document.createElement('p');source.className='caption';source.textContent=a.demo?'FICTIONAL SCENARIO · synthetic measurements':a.id==='bone'?'MISSION MODEL · not measured bone density':'PERSONAL HEALTH SUPPORT';
    const h=document.createElement('h3');h.textContent=a.title;
    const p=document.createElement('p');p.textContent=a.message;
    const e=document.createElement('p');e.className='caption';e.textContent=a.evidence;
    const controls=document.createElement('div');controls.className='support-actions';
    const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;controls.append(b);};
    button('▶ Play recommendation',()=>speak(a));
    button('Ask companion',()=>{
      const row=document.createElement('div'),answer=document.createElement('p');answer.textContent=`${a.demo?'FICTIONAL SCENARIO · ':''}${a.title}: ${a.message} Evidence: ${a.evidence}`;row.append(answer);$('companionLog').append(row);
      $('aiQuestion').value=`Explain this AURA wellness prompt: ${a.title}. ${a.message} Evidence: ${a.evidence} ${a.demo?'These are fictional demo values.':''} Suggest a non-clinical next step.`;
      close();$('aiQuestion').scrollIntoView({behavior:'smooth',block:'center'});$('aiQuestion').focus();
    });
    button('Use in reassessment',()=>{if(preview){status('This is a fictional preview. Return to current data to choose an action for your personal reassessment.');return;}close();selectAction(a.action);});
    if(a.id==='mindfulness')button('Open preferred app',()=>{
      try{const url=new URL($('supportApp').value);if(url.protocol!=='https:')throw Error();window.open(url.href,'_blank','noopener,noreferrer');status('App opened without sharing measurements. Record completion when finished.');}catch{status('Enter an HTTPS address under Notification settings first.');}
    });
    button('Dismiss',()=>{dismissedSet().add(a.id);stopAudio();currentId=null;render();});
    card.append(source,h,p,e,controls);$('supportList').append(card);
  }
  $('supportBell').onclick=()=>{currentId=visible().find(a=>!readSet().has(a.id))?.id||visible()[0]?.id||null;$('supportDialog').showModal();render();$('supportClose').focus();};
  $('supportClose').onclick=close;
  $('supportDialog').addEventListener('cancel',stopAudio);
  $('supportStop').onclick=()=>{stopAudio();status('Playback stopped.');};
  $('supportNext').onclick=()=>{const items=visible(),i=items.findIndex(a=>a.id===currentId);stopAudio();currentId=items[(i+1)%items.length]?.id;status('Press Play recommendation to listen.');render();};
  return {
    update(value){
      state=value;
      renderPhysiology();
      if(lastMode!==state.mode){dismissed.clear();read.clear();stopAudio();currentId=null;signature='';lastMode=state.mode;}
      alerts=supportAlerts(state);
      const next=JSON.stringify(alerts);
      if(next!==signature){signature=next;render();}
    },
    clear(){preview=false;previewDismissed.clear();previewRead.clear();$('supportPreview').textContent='Preview all 4 scenarios';dismissed.clear();read.clear();signature='';currentId=null;stopAudio();$('supportApp').value='';if($('supportDialog').open)close();status('Notifications reset.');}
  };
}
