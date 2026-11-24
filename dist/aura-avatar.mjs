import {playNaturalVoice,stopNaturalVoice} from './natural-voice.mjs?v=0.17';
export function mountAuraAvatar(){
  const $=id=>document.getElementById(id),player=$('auraIntroAudio');
  const status=text=>{$('auraAvatarStatus').textContent=text;};
  const highlight=playing=>$('auraPortrait').classList.toggle('speaking',playing);
  $('auraMeet').onclick=()=>playNaturalVoice({kind:'introduction',player,status});
  $('auraIntroStop').onclick=()=>{stopNaturalVoice();status('Introduction stopped.');};
  player.addEventListener('play',()=>{highlight(true);status('AURA is introducing herself.');});
  player.addEventListener('pause',()=>{highlight(false);status('Introduction paused.');});
  player.addEventListener('ended',()=>{highlight(false);status('Ready when you are. Type a question below.');});
  player.addEventListener('error',()=>{highlight(false);status('Introduction audio unavailable. The transcript is below.');});
  $('auraTalk').onclick=()=>{
    stopNaturalVoice();
    $('aiQuestion').scrollIntoView({behavior:'smooth',block:'center'});
    $('aiQuestion').focus();
    status('Type your question below. Review the sharing consent before sending.');
  };
}
