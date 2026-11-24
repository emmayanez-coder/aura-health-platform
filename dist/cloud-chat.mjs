import {mountAnswerVoice} from './answer-voice.mjs?v=0.17';
const finite=x=>Number.isFinite(x)?x:null;
export function healthSnapshot(state,loop,now=Date.now()) {
  const {input,result,assessment:a,mode}=state;
  const demo=mode==='demo',age=now-Date.parse(a?.measuredAt);
  const valid=!demo&&a?.demo===false&&age>=0&&age<86400000&&a.quality?.hrCoverage>=.8;
  const b=input.baseline,m=input.metrics;
  return {
    mode:demo?'demo':'real',capturedAt:new Date(now).toISOString(),
    assessmentAt:valid?a.measuredAt:null,
    hrBpm:demo?finite(m.hrBpm):valid?finite(a.hrBpm):null,
    rmssdMs:demo?finite(m.rmssdMs):valid&&a.quality?.rrCoverage>=.8?finite(a.rmssdMs):null,
    hrCoverage:demo?null:valid?finite(a.quality.hrCoverage):null,
    rrCoverage:demo?null:valid?finite(a.quality.rrCoverage):null,
    baselineDays:b.validDays||0,
    hrReference:b.validDays>=7?finite(b.hrMedian):null,
    rmssdReference:b.validDays>=7&&b.hrvValidDays>=7?finite(Math.exp(b.logRmssdMedian)):null,
    sleepHours:input.eligible.sleep?finite(m.sleepHours):null,
    sleepTargetHours:input.eligible.sleep?finite(m.sleepTargetHours):null,
    activityPercent:input.eligible.activity&&m.plannedUnits>0?Math.min(100,100*m.completedUnits/m.plannedUnits):null,
    score:result.score,scoreCoverage:result.coveragePercent,
    loopState:loop?.status||'none',
    // No raw ECG, device identifier, notes, entire record or baseline history.
    hrChange:loop?.status==='complete'?finite(loop.comparison?.hrDeltaBpm):null,
    rmssdChange:loop?.status==='complete'?finite(loop.comparison?.rmssdDeltaMs):null
  };
}

export function mountCloudChat(getContext) {
  const $=id=>document.getElementById(id);
  const voice=mountAnswerVoice();
  let history=[],controller=null,generation=0,lastMode=null,preview=null;
  const status=s=>{$('aiStatus').textContent=s;};
  function reset(message='Cloud conversation cleared from this browser. Already sent requests cannot be recalled.') {
    voice.clear();generation++;controller?.abort();controller=null;history=[];preview=null;
    $('aiLog').replaceChildren();$('aiPreview').textContent='Click Review data to inspect the next snapshot.';
    $('aiSend').disabled=false;$('aiQuestion').value='';$('aiConsent').checked=false;status(message);
  }
  function row(role,text) {const el=document.createElement('div'),b=document.createElement('b'),p=document.createElement('p');b.textContent=role;p.textContent=text;el.append(b,p);if(role.startsWith('AURA AI')){const read=document.createElement('button');read.type='button';read.textContent='▶ Read aloud';read.onclick=()=>voice.speak(text);el.append(read);}$('aiLog').append(el);el.scrollIntoView({block:'nearest',behavior:'smooth'});while($('aiLog').children.length>12)$('aiLog').firstElementChild.remove();}
  async function jsonFetch(url,options={}) {
    const headers={...options.headers};
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers});
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Cloud endpoint unavailable. Check PHP upload and hosting setup.');
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;
  }
  $('aiReview').onclick=()=>{const c=getContext();if(!c)return;preview=healthSnapshot(c.state,c.loop);$('aiPreview').textContent=JSON.stringify(preview,null,2);};
  $('aiCheck').onclick=async()=>{status('Checking companion access…');try{const session=await jsonFetch('./api/chat.php');status('Cloud chat is ready: '+(session.access||'authorized')+' access. No health data sent by this check.');}catch(e){status(e.message);}};
  $('aiClear').onclick=()=>reset();
  $('aiForm').onsubmit=async e=>{
    e.preventDefault();if(controller)return;
    const question=$('aiQuestion').value.trim();if(!question)return;
    if(!$('aiConsent').checked){status('Confirm sharing before sending.');return;}
    const c=getContext();if(!c){status('Dashboard is still initializing.');return;}
    const snapshot=healthSnapshot(c.state,c.loop),turn=generation;
    $('aiPreview').textContent=JSON.stringify(snapshot,null,2);
    controller=new AbortController();const activeController=controller,signal=activeController.signal;
    const timer=setTimeout(()=>activeController.abort(),65000);
    $('aiSend').disabled=true;status('Sending to OpenAI through your website…');
    row('You'+(snapshot.mode==='demo'?' · DEMO':''),question);
    try {
      const session=await jsonFetch('./api/chat.php',{signal});
      const data=await jsonFetch('./api/chat.php',{method:'POST',signal,headers:{'Content-Type':'application/json','X-AURA-Nonce':session.nonce},body:JSON.stringify({consent:true,question,history,snapshot})});
      if(turn!==generation)return;
      row('AURA AI'+(snapshot.mode==='demo'?' · DEMO':''),data.answer);
      voice.received(data.answer);
      history=[...history,{role:'user',content:question},{role:'assistant',content:data.answer}].slice(-6);
      $('aiQuestion').value='';status('Answer uses the snapshot shown below. AI can make mistakes; no records or actions were changed.');
    } catch(error){if(turn===generation){status(error.name==='AbortError'?'Request stopped or timed out. No automatic retry; a request already sent may still be processed.':error.message);}}
    finally {clearTimeout(timer);if(turn===generation){controller=null;$('aiSend').disabled=false;}}
  };
  return {clear:reset,update(mode){if(lastMode!==null&&mode!==lastMode)reset('Mode changed. Cloud history and sharing consent cleared to separate demo and real data.');lastMode=mode;}};
}
