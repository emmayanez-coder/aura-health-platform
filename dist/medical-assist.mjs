import {playNaturalVoice,stopNaturalVoice} from './natural-voice.mjs?v=0.17';
export const TRAINING = Object.freeze({
  id:'aura-dizziness-training-v1',version:'1.1',approval:'Fictional workflow demonstration; not a validated medical procedure',
  patient:'SIM-01 — fictional crew member',
  steps:[
  {
    "id": "open",
    "title": "Open the incident and review the report",
    "audio": "01-open-v11.wav",
    "text": "Medical Assist is ready. A crew member reports sudden dizziness during a scheduled activity. The incident record is open. Review the reported onset and current observations in the patient panel. Confirm this step to proceed to medical support contact."
  },
  {
    "id": "contact",
    "title": "Contact medical support",
    "audio": "02-contact-v11.wav",
    "text": "Request assistance from the crew medical officer through your established communication channel. Record contact attempted while awaiting a response. Select support acknowledged only after a response has been received. Confirm this step once you have recorded the communication status."
  },
  {
    "id": "observe",
    "title": "Record symptoms and observations",
    "audio": "03-observations-v11.wav",
    "text": "Ask the crew member to describe what they are experiencing and when it began. The current report states that dizziness began about two minutes before the incident, and the crew member is responding verbally. Record any additional observations in the step note. Leave information you cannot establish as unknown. Confirm when the observations are recorded."
  },
  {
    "id": "measure",
    "title": "Review the available measurements",
    "audio": "04-measurements-v11.wav",
    "text": "Review the heart rate displayed in the monitoring panel. Other vital signs have not been supplied. Use the follow-up control to review the next available sample. Record changes without assuming they establish recovery or explain the dizziness. Confirm when you have reviewed the available measurements."
  },
  {
    "id": "handover",
    "title": "Prepare the medical handover",
    "audio": "05-handover-v11.wav",
    "text": "Prepare the handover for medical support. Include the reported onset, symptoms, verbal responsiveness, available measurements, communication status, and actions recorded so far. Review the summary for accuracy and identify outstanding questions. Confirm this step and export the incident record for handover through your established communication channel."
  }
]
});
export function startTraining(now=new Date().toISOString(),id=crypto.randomUUID()) {
  return {schema:'aura-medical-training-v1',scenario:TRAINING.id,version:TRAINING.version,simulation:true,id,startedAt:now,status:'active',index:0,steps:TRAINING.steps.map(s=>({id:s.id,status:'pending',note:''})),communication:'not-contacted',sample:0,events:[{at:now,type:'training_started'}]};
}
export function trainingEvent(session,type,value='',now=new Date().toISOString()) {
  if(!session||session.status!=='active')throw new Error('Start an active training incident first.');
  if(session.events.length>=500)throw new Error('Training log limit reached. Export the record and start a new page session.');
  const s=structuredClone(session),step=s.steps[s.index];
  if(type==='note'){step.note=String(value).slice(0,500);return s;}
  if(type==='communication') {
    if(!['not-contacted','attempted','acknowledged'].includes(value))throw new Error('Invalid simulated communication state.');
    s.communication=value;
  } else if(type==='confirm') {
    if(step.id==='contact'&&s.communication==='not-contacted')throw new Error('Choose a simulated contact status before confirming this step.');
    step.status='confirmed';step.confirmedAt=now;
    if(s.index===s.steps.length-1){
      if(s.steps.some(x=>x.status!=='confirmed'))throw new Error('Confirm all checklist steps before completing training.');
      s.status='complete';s.finishedAt=now;
    } else s.index++;
  } else if(type==='unable') {step.status='unable';}
  else if(type==='back') {s.index=Math.max(0,s.index-1);}
  else if(type==='followup') {if(s.index<3)throw new Error('Review the measurement step first.');s.sample=1;}
  else if(type==='end') {s.status='ended-early';s.finishedAt=now;}
  else if(!['play','pause','audio-ended','audio-error'].includes(type))throw new Error('Unknown training event.');
  s.events.push({at:now,type,step:step.id,...(type==='communication'?{value}:{})});return s;
}
export function trainingHandover(s) {
  if(!s)return 'No training incident has started.';
  return ['TRAINING SIMULATION — NOT A REAL MEDICAL HANDOVER',`Scenario: ${TRAINING.id} (${TRAINING.version}). ${TRAINING.approval}.`,`Patient: ${TRAINING.patient}.`,`Status: ${s.status}; started ${s.startedAt}.`,
    'Scripted report: dizziness began about two minutes before the fictional incident; crew member responds verbally. Cause and outcome unknown.',
    `Simulated communication: ${s.communication}. No call or message has been sent by AURA.`,
    `Scripted HR: initial 96 BPM${s.sample?' → follow-up 94 BPM (loaded by user; not elapsed-time monitoring)':''}. HRV, SpO2, BP, respiration and temperature: not supplied.`,
    ...s.steps.map((x,i)=>`${i+1}. ${TRAINING.steps[i].title}: ${x.status}${x.confirmedAt?' at '+x.confirmedAt:''}.${x.note?' Fictional user note: '+x.note:''}`),
    'No diagnosis, treatment, patient improvement or real medical-support acknowledgment is inferred.'].join('\n\n');
}
export function mountMedicalAssist({onComplete=()=>{}}={}) {
  const $=id=>document.getElementById(id),put=(id,v)=>$(id).textContent=v;
  let session=null,sessions=[],loaded=null;
  const player=$('medicalAudio');
  function save(){if(session){const i=sessions.findIndex(x=>x.id===session.id);if(i<0)sessions.push(session);else sessions[i]=session;}}
  function stop(){stopNaturalVoice();try{player.pause();player.currentTime=0;}catch{}}
  function render(){
    const active=session?.status==='active',step=TRAINING.steps[session?.index??0];
    put('medicalStepTitle',session?`${session.index+1} / ${TRAINING.steps.length} · ${step.title}`:'Ready for a fictional training incident');
    put('medicalTranscript',session?step.text:'Start training, then select Play narration. Every spoken word also appears here. Audio playback never confirms a step.');
    put('medicalProgress',session?session.status==='active'?`Checklist: ${session.steps.filter(x=>x.status==='confirmed').length} / 5 confirmed`:`Training ${session.status==='complete'?'complete':'ended early'} — not a patient outcome`:'No training incident running');
    put('medicalComms',`SIMULATION ONLY · ${session?.communication??'not-contacted'} · no real connection`);
    put('medicalVitals',session?`SCRIPTED PATIENT · HR ${session.sample?94:96} BPM · ${session.sample?'follow-up sample loaded by user':'initial sample'} · other vitals unavailable`:'No real patient measurements enter this simulation.');
    put('medicalSummary',trainingHandover(session));
    $('medicalStart').disabled=active||sessions.length>=20;
    for(const id of ['medicalPlay','medicalPause','medicalConfirm','medicalUnable','medicalEnd'])$(id).disabled=!active;
    $('medicalBack').disabled=!active||session.index===0;
    $('medicalFollowup').disabled=!active||session.index<3||session.sample===1;
    $('medicalExport').disabled=!session;
    $('medicalContact').disabled=!active||session.index!==1;
    $('medicalContact').value=session?.communication??'not-contacted';
    $('medicalNote').disabled=!active;
    $('medicalNote').value=session?.steps[session.index].note??'';
    $('medicalConfirm').textContent=session?.index===4?'Confirm final step':'Confirm step & next';
    $('medicalChecklist').replaceChildren(...TRAINING.steps.map((x,i)=>{
      const li=document.createElement('li');li.textContent=`${x.title} — ${session?.steps[i].status??'not started'}`;
      if(session?.index===i)li.setAttribute('aria-current','step');return li;
    }));
    const source=active?step.id:null;
    if(source!==loaded){stop();loaded=source;player.removeAttribute('src');player.load();put('medicalAudioStatus',source?'Narration ready. Press Play; internet is required. The transcript stays available.':'Narration stopped.');}
  }
  function apply(type,value){
    try{session=trainingEvent(session,type,value);save();render();if(session.status==='complete'&&type==='confirm')onComplete(session.id);put('medicalFeedback',type==='unable'?'Marked unable. The step has not advanced. Resolve it and explicitly confirm, go back, or end the simulation.':type==='confirm'?'Step explicitly confirmed.':type==='end'?'Training ended early. Export to retain the incident log.':'');}
    catch(e){put('medicalFeedback',e.message);}
  }
  $('medicalStart').onclick=()=>{if(session?.status==='active')return;session=startTraining();save();render();put('medicalFeedback','Training started. No real medical support has been contacted.');};
  $('medicalConfirm').onclick=()=>apply('confirm');$('medicalUnable').onclick=()=>apply('unable');$('medicalBack').onclick=()=>apply('back');
  $('medicalEnd').onclick=()=>{stop();apply('end');};
  $('medicalContact').onchange=e=>apply('communication',e.target.value);
  $('medicalFollowup').onclick=()=>apply('followup');
  $('medicalNote').oninput=e=>{if(session?.status==='active'){session=trainingEvent(session,'note',e.target.value);save();put('medicalSummary',trainingHandover(session));}};
  $('medicalPlay').onclick=async()=>{
    if(session?.status!=='active')return;
    const activeId=session.id,activeIndex=session.index;
    const stillHere=()=>session?.id===activeId&&session.status==='active'&&session.index===activeIndex;
    const played=await playNaturalVoice({kind:'script',scriptId:'medical-'+TRAINING.steps[activeIndex].id,player,status:t=>put('medicalAudioStatus',t),onEnd:()=>{if(stillHere()){apply('audio-ended');put('medicalAudioStatus','Narration finished. Confirm the step yourself when ready.');}}});
    if(played&&stillHere())apply('play');
  };
  $('medicalPause').onclick=()=>{stop();apply('pause');put('medicalAudioStatus','Narration stopped. Select Play / replay to restart.');};
  player.onended=()=>{if(session?.status==='active'){apply('audio-ended');put('medicalAudioStatus','Narration finished. The step is NOT confirmed; choose Confirm step or Unable to complete.');}};
  player.onerror=()=>{if(session?.status==='active')put('medicalAudioStatus','Audio unavailable. The complete transcript remains visible. Check your internet connection or try again later.');};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
  $('medicalExport').onclick=()=>{
    save();const blob=new Blob([JSON.stringify({schema:'aura-medical-training-export-v1',simulation:true,exportedAt:new Date().toISOString(),procedure:TRAINING,sessions,handover:trainingHandover(session)},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AURA-Medical-TRAINING-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  render();
  return {clear(){stop();session=null;sessions=[];render();put('medicalFeedback','Training history cleared from this browser.');}};
}
