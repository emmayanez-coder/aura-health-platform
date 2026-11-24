let current=null,controller=null,generation=0;
const cache=new Map();
export function stopNaturalVoice(clear=false){
  generation++;controller?.abort();controller=null;
  if(current){current.pause();try{current.currentTime=0;}catch{}current=null;}
  document.getElementById('auraPortrait')?.classList?.toggle('speaking',false);
  if(clear){for(const url of cache.values())URL.revokeObjectURL(url);cache.clear();const intro=document.getElementById('auraIntroAudio');intro?.removeAttribute?.('src');intro?.load?.();}
}
export async function playNaturalVoice({kind,text='',scriptId='',player,status,onEnd=()=>{},onError=()=>{}}){
  stopNaturalVoice();const token=generation;
  if(kind==='answer'&&[...text].length>4000){status('This answer is too long to narrate. Ask AURA for a shorter summary.');return;}
  const key=kind+'|'+scriptId+'|'+text;
  const request=new AbortController();controller=request;
  const timer=setTimeout(()=>request.abort(),65000);
  try{
    let url=cache.get(key);
    if(!url){
      status('Preparing audio…');
      const headers={};
      const json=async(options)=>{
        const r=await fetch('./api/speech.php',{credentials:'same-origin',cache:'no-store',signal:request.signal,...options});
        if(!r.headers.get('content-type')?.includes('application/json'))throw Error('Speech endpoint unavailable. Check the uploaded api files.');
        const data=await r.json();if(!r.ok)throw Error(data.error||'Audio is unavailable.');return data;
      };
      const session=await json({headers});
      const data=await json({method:'POST',headers:{...headers,'Content-Type':'application/json','X-AURA-Nonce':session.nonce},body:JSON.stringify(kind==='introduction'?{kind}:kind==='script'?{kind,scriptId}:{kind,text,speechConsent:true})});
      if(token!==generation)return;
      if(typeof data.audio!=='string'||data.audio.length>12000000)throw Error('Invalid speech response.');
      const bytes=Uint8Array.from(atob(data.audio),c=>c.charCodeAt(0));
      url=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));cache.set(key,url);
      if(cache.size>16){const oldest=cache.keys().next().value;URL.revokeObjectURL(cache.get(oldest));cache.delete(oldest);}
    }
    if(token!==generation)return;
    current=player;player.src=url;
    player.onended=()=>{if(token===generation){document.getElementById('auraPortrait')?.classList?.toggle('speaking',false);status('Finished speaking.');onEnd();}};
    player.onerror=()=>{if(token===generation){status('Audio playback failed. The text remains available.');onError();}};
    await player.play();
    if(token===generation){document.getElementById('auraPortrait')?.classList?.toggle('speaking',true);status('AURA is speaking.');return true;}
  }catch(e){if(token===generation)status(e.name==='AbortError'?'Voice request timed out. Press Play to try again.':e.message);}
  finally{clearTimeout(timer);if(token===generation)controller=null;}
}
