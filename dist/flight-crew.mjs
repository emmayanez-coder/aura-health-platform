import {SignalWindow} from './sensors/heart-rate.mjs';

// Research replay adapter, not a medical ECG detector or an attention classifier.
export function detectBeats(samples, sampleRate = 256) {
  if (sampleRate !== 256 || !Array.isArray(samples) || samples.length < 512) throw new Error('Expected a 256 Hz ECG excerpt');
  for (let i=0;i<samples.length;i++) {
    if (!samples[i].every(Number.isFinite) || samples[i].length!==2) throw new Error('Invalid time/ECG sample');
    if (i && Math.abs(samples[i][0]-samples[i-1][0]-1/sampleRate)>0.0001) throw new Error('Non-contiguous ECG timestamps');
  }
  // Remove a centered 200 ms moving mean; use absolute amplitude for either polarity.
  const half=26, prefix=[0];
  for (const [,v] of samples) prefix.push(prefix.at(-1)+v);
  const amplitude=samples.map(([,v],i)=>{
    const l=Math.max(0,i-half), r=Math.min(samples.length,i+half+1);
    return Math.abs(v-(prefix[r]-prefix[l])/(r-l));
  });
  const sorted=[...amplitude].sort((a,b)=>a-b);
  const median=sorted[Math.floor(sorted.length/2)];
  const deviations=amplitude.map(v=>Math.abs(v-median)).sort((a,b)=>a-b);
  const threshold=median+6*deviations[Math.floor(deviations.length/2)];
  if (!(threshold>0)) return {peaks:[],threshold};
  const candidates=[];
  for(let i=half;i<amplitude.length-half;i++) {
    if(amplitude[i]>threshold && amplitude[i]>=amplitude[i-1] && amplitude[i]>amplitude[i+1]) candidates.push(i);
  }
  // Highest candidate wins within 300 ms; this is a fixed engineering heuristic.
  candidates.sort((a,b)=>amplitude[b]-amplitude[a]);
  const blocked=new Uint8Array(samples.length), selected=[];
  for(const i of candidates) if(!blocked[i]) {
    selected.push(i);
    blocked.fill(1,Math.max(0,i-Math.ceil(.3*sampleRate)+1),Math.min(samples.length,i+Math.ceil(.3*sampleRate)));
  }
  selected.sort((a,b)=>a-b);
  return {peaks:selected.map(i=>({index:i,timeSeconds:samples[i][0]})),threshold};
}

export function replayFlightCrew(data) {
  if(data.schema!=='aura-flight-crew-ecg-v1') throw new Error('Unsupported flight-crew excerpt');
  const detection=detectBeats(data.samples,data.sampleRate);
  const signal=new SignalWindow();
  const intervals=[];
  for(let i=1;i<detection.peaks.length;i++) {
    const timeMs=detection.peaks[i].timeSeconds*1000;
    const rrMs=(detection.peaks[i].timeSeconds-detection.peaks[i-1].timeSeconds)*1000;
    const packet={hr:60000/rrMs,rr:[rrMs],contact:null};
    const accepted=signal.add(packet,timeMs);
    intervals.push({timeSeconds:timeMs/1000,rrMs,hrBpm:packet.hr,hrAccepted:accepted});
  }
  const end=data.samples.at(-1)[0]*1000;
  const summary=signal.summary(end,300,end-300000);
  return {schema:'aura-flight-crew-result-v1',source:data.provenance,detector:'Centered 200 ms mean removal; absolute amplitude > median + 6 MAD; 300 ms refractory period',peakCount:detection.peaks.length,intervalCount:intervals.length,threshold:detection.threshold,summary,intervals,scope:'One ECG excerpt; engineering replay through SignalWindow. No annotated R-peak ground truth, clinical accuracy, attention classification or readiness validation. Does not test BLE transport or wearable accuracy.'};
}
