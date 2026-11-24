import {playNaturalVoice,stopNaturalVoice} from './natural-voice.mjs?v=0.17';
export function mountAnswerVoice(){
  const $=id=>document.getElementById(id),player=new Audio();
  const status=t=>{$('answerVoiceStatus').textContent=t;};
  const speak=text=>playNaturalVoice({kind:'answer',text,player,status});
  const stop=()=>stopNaturalVoice();
  $('answerVoiceStop').onclick=()=>{stop();status('Speech stopped.');};
  $('answerVoiceAuto').onchange=()=>{if(!$('answerVoiceAuto').checked)stop();};
  return {speak,stop,clear(){stopNaturalVoice(true);$('answerVoiceAuto').checked=false;},received(text){if($('answerVoiceAuto').checked)speak(text);}};
}
