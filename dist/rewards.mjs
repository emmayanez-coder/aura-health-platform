export const ACTIONS={rest:'Followed my approved rest/recovery plan',mindfulness:'Completed an optional mindfulness session',exercise:'Followed my approved exercise plan',review:'Reviewed my health log or measurement conditions',practice:'Completed Medical Assist checklist practice'};
export function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function dayOffset(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d;}
export function weekKey(date=new Date()){return dayKey(dayOffset(date,-((date.getDay()+6)%7)));}
export function addReward(records,event,now=new Date()){
  if(!event||typeof event.id!=='string'||!ACTIONS[event.category]||event.completed!==true||event.demo===true)return {records,earned:false};
  const day=dayKey(now);
  if(records.some(r=>r.id===event.id||(r.day===day&&r.category===event.category)))return {records,earned:false};
  // Explicit whitelist: never retain or evaluate biomarkers, scores, notes or sensor identifiers.
  const item={id:event.id,day,category:event.category,source:event.source==='medical'?'medical':event.source==='reassessment'?'reassessment':'self-reported',stars:1};
  return {records:[...records,item],earned:true};
}
export function rewardSummary(records,now=new Date()){
  const today=dayKey(now),week=weekKey(now),days=new Set(records.filter(r=>r.day<=today).map(r=>r.day));
  let cursor=days.has(today)?now:dayOffset(now,-1),streak=0;
  while(days.has(dayKey(cursor))){streak++;cursor=dayOffset(cursor,-1);}
  return {stars:records.length,streak,days:days.size,week:records.filter(r=>r.day>=week&&r.day<=today).length,practice:records.filter(r=>r.category==='practice').length};
}
export function actionCategory(action){return /mindfulness/i.test(action)?'mindfulness':/exercise/i.test(action)?'exercise':/rest|recovery/i.test(action)?'rest':'review';}
const STORE='aura-action-rewards-v1';
function empty(){return {records:[],crew:{week:weekKey(),goal:12,reward:'Crew choice: a shared movie or music session',members:[],leaderboard:false}};}
export function cleanRewards(value){
  const clean=empty(),seen=new Set();
  for(const r of Array.isArray(value?.records)?value.records:[]){
    if(typeof r?.id!=='string'||!ACTIONS[r.category]||!/^\d{4}-\d{2}-\d{2}$/.test(r.day)||seen.has(r.day+'|'+r.category))continue;
    seen.add(r.day+'|'+r.category);clean.records.push({id:r.id.slice(0,100),day:r.day,category:r.category,source:['medical','reassessment'].includes(r.source)?r.source:'self-reported',stars:1});
  }
  const c=value?.crew;
  if(c?.week===weekKey()){
    clean.crew.goal=Number.isInteger(c.goal)?Math.max(1,Math.min(56,c.goal)):12;
    clean.crew.reward=typeof c.reward==='string'?c.reward.slice(0,100):clean.crew.reward;
    clean.crew.leaderboard=c.leaderboard===true;
    clean.crew.members=(Array.isArray(c.members)?c.members:[]).filter(m=>typeof m.alias==='string'&&Number.isInteger(m.days)&&m.days>=0&&m.days<=7).slice(0,8).map(m=>({alias:m.alias.slice(0,30),days:m.days,optIn:m.optIn===true}));
  }
  return clean;
}
export function mountRewards(){
  const $=id=>document.getElementById(id);
  let data=empty(),demo=empty(),preview=false,mode='real',storage=true;
  try{data=cleanRewards(JSON.parse(localStorage.getItem(STORE)||'null'));}catch{storage=false;}
  const current=()=>preview?demo:data;
  const say=t=>{$('rewardStatus').textContent=t;};
  const save=()=>{if(!preview)try{localStorage.setItem(STORE,JSON.stringify(data));}catch{storage=false;say('Rewards work for this session, but browser storage is unavailable. Export to keep them.');}};
  function seed(){demo=empty();for(const [offset,category] of [[-2,'rest'],[-1,'mindfulness'],[0,'review'],[0,'practice']])demo.records.push({id:'demo-'+offset+category,day:dayKey(dayOffset(new Date(),offset)),category,source:'self-reported',stars:1});demo.crew.members=[{alias:'Crew A',days:3,optIn:true},{alias:'Crew B',days:2,optIn:true},{alias:'Crew C',days:2,optIn:false}];}
  seed();
  function bar(label,count,caption,category='crew'){
    const row=document.createElement('li');row.className='reward-bar-row reward-color-'+category;
    const heading=document.createElement('div');heading.className='reward-bar-heading';
    const name=document.createElement('span');name.textContent=label;
    const value=document.createElement('strong');value.textContent=`${count} / 7 days`;
    heading.append(name,value);
    const progress=document.createElement('progress');progress.max=7;progress.value=count;progress.className='reward-visual-bar';progress.ariaLabel=`${label}: ${count} of 7 days this week`;
    const note=document.createElement('small');note.textContent=caption;
    row.append(heading,progress,note);return row;
  }
  function render(){
    const d=current();if(d.crew.week!==weekKey())d.crew=empty().crew;
    const summary=rewardSummary(d.records);
    $('rewardsMode').textContent=preview?'DEMO · FICTIONAL REWARDS':'PERSONAL · THIS BROWSER';
    $('rewardsPreview').textContent=preview?'Return to my rewards':'Preview rewards';
    $('rewardsPreview').disabled=mode==='demo';
    $('rewardStars').textContent=summary.stars;$('rewardStreak').textContent=summary.streak;$('rewardWeek').textContent=summary.week;
    $('rewardProgress').value=Math.min(summary.week,3);
    $('rewardBadges').replaceChildren();
    for(const [title,earned] of [['First step',summary.stars>=1],['Three action days',summary.days>=3],['Practice participant',summary.practice>=1]]){const b=document.createElement('span');b.className='reward-badge '+(earned?'earned':'');b.textContent=(earned?'★ ':'☆ ')+title;$('rewardBadges').append(b);}
    $('rewardPractice').textContent=`${summary.practice} practice day${summary.practice===1?'':'s'} recognized · participation, not clinical competency`;
    $('rewardActionBars').replaceChildren();
    const labels={rest:'Rest & recovery',mindfulness:'Mindfulness',exercise:'Exercise plan',review:'Health check-ins',practice:'Medical practice'};
    const week=weekKey(),today=dayKey();
    for(const [category,label] of Object.entries(labels)){
      const count=new Set(d.records.filter(r=>r.category===category&&r.day>=week&&r.day<=today).map(r=>r.day)).size;
      $('rewardActionBars').append(bar(label,count,count?'Recognized action days this week':'No recorded action days this week',category));
    }
    $('rewardHistory').replaceChildren();
    for(const r of d.records.slice(-6).reverse()){const li=document.createElement('li');li.textContent=`★ ${ACTIONS[r.category]} · ${r.day} · ${r.source}`;$('rewardHistory').append(li);}
    $('rewardStorage').textContent=preview?'Preview is separate and never saved to your personal rewards.':storage?'Action categories and dates stay in this browser. No biomarkers or health scores are stored in rewards. Export before changing devices.':'Session only: browser storage unavailable. Export to keep your rewards.';
    const c=d.crew,total=c.members.reduce((n,m)=>n+m.days,0);
    $('crewGoal').value=c.goal;$('crewReward').value=c.reward;$('crewLeaderboard').checked=c.leaderboard;
    $('crewProgress').max=c.goal;$('crewProgress').value=Math.min(total,c.goal);
    $('crewSummary').textContent=`Week of ${c.week} · ${total} / ${c.goal} reported action days across the crew. ${total>=c.goal?'Shared objective reached — celebrate together!':'Each person can contribute at most one action day per day.'}`;
    const categories=['Consistency','Recovery-plan adherence','Learning and practice'];
    $('crewRecognition').textContent='Suggested rotating recognition: '+categories[Math.floor(Date.parse(c.week+'T12:00:00Z')/604800000)%categories.length];
    $('crewMembers').replaceChildren();
    if(!c.members.length){const empty=document.createElement('li');empty.className='reward-empty';empty.textContent='Add a consenting crew report to see weekly contribution bars.';$('crewMembers').append(empty);}
    c.members.forEach((m,index)=>{const li=bar(m.alias,m.days,`Self-reported · ${m.optIn?'ranking opted in':'not included in ranking'}`);const remove=document.createElement('button');remove.type='button';remove.className='quiet reward-remove';remove.textContent='Remove';remove.onclick=()=>{c.members.splice(index,1);save();render();};li.append(remove);$('crewMembers').append(li);});
    $('crewRanks').replaceChildren();
    if(c.leaderboard){const members=c.members.filter(m=>m.optIn).sort((a,b)=>b.days-a.days);for(const m of members){const rank=1+members.filter(x=>x.days>m.days).length;const li=bar(`${rank}. ${m.alias}`,m.days,'Optional friendly ranking · action days only');$('crewRanks').append(li);}}
    $('crewRanks').hidden=!c.leaderboard;
  }
  function award(category,id,source){
    const d=current(),result=addReward(d.records,{id,category,source,completed:true});d.records=result.records;save();render();
    say(result.earned?`${preview?'DEMO · ':''}★ One star for ${ACTIONS[category].toLowerCase()}.`:'This action category has already earned its star today. There is no benefit to repeating it for points.');
  }
  $('rewardsPreview').onclick=()=>{preview=!preview;if(preview)seed();render();say(preview?'Fictional rewards preview. Try recording an action without changing your personal record.':'Showing your personal rewards.');};
  $('rewardRecord').onclick=()=>{
    if(!$('rewardAppropriate').checked){say('Confirm the action was completed and appropriate to your existing plan.');return;}
    const category=$('rewardAction').value;if(!ACTIONS[category]||category==='practice')return;
    award(category,crypto.randomUUID(),'self-reported');$('rewardAppropriate').checked=false;
  };
  $('crewSave').onclick=()=>{
    const goal=Number($('crewGoal').value);if(!Number.isInteger(goal)||goal<1||goal>56){say('Choose a whole-number crew target from 1 to 56 action days.');return;}
    current().crew.goal=goal;current().crew.reward=$('crewReward').value.trim().slice(0,100);current().crew.leaderboard=$('crewLeaderboard').checked;save();render();say('Local crew plan saved. No invitations or rewards have been sent.');
  };
  $('crewAdd').onclick=()=>{
    const c=current().crew,alias=$('crewAlias').value.trim(),days=Number($('crewDays').value);
    if(!alias||alias.length>30||!Number.isInteger(days)||days<0||days>7||!$('crewPermission').checked){say('Enter an alias, 0–7 reported action days, and confirm permission to include this report.');return;}
    const m={alias,days,optIn:$('crewRankConsent').checked},index=c.members.findIndex(x=>x.alias.toLowerCase()===alias.toLowerCase());
    if(index>=0)c.members[index]=m;else if(c.members.length<8)c.members.push(m);else {say('This local crew board supports up to eight aliases.');return;}
    save();render();$('crewAlias').value='';$('crewPermission').checked=false;$('crewRankConsent').checked=false;say('Self-reported crew entry saved locally. No health measurements are shared.');
  };
  $('rewardExport').onclick=()=>{const blob=new Blob([JSON.stringify({schema:STORE,demo:preview,...current()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`AURA-${preview?'DEMO-':''}rewards-${dayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  function clear(){data=empty();seed();try{localStorage.removeItem(STORE);}catch{}render();say('Local rewards and crew entries cleared.');}
  $('rewardClear').onclick=()=>{if($('rewardClearConfirm').checked){clear();$('rewardClearConfirm').checked=false;}else say('Check the confirmation before clearing your rewards.');};
  render();
  return {
    actionCompleted(action,id){if(mode==='demo')return;const was=preview;preview=false;award(actionCategory(action),id,'reassessment');preview=was;if(was)render();},
    trainingCompleted(id){if(mode==='demo'||preview){award('practice',id,'medical');return;}award('practice',id,'medical');},
    setMode(next){if(next===mode)return;mode=next;preview=next==='demo';if(preview)seed();render();},
    export(){return structuredClone({schema:STORE,...data});},clear
  };
}
