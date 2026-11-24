// NASA rates are historical detector observations. Integration is an AURA estimate.
export function integrateNasaRadiation(dataset, startDate = '2024-01-01', endDate = '2024-01-07') {
  if (dataset?.schema !== 'aura-nasa-rad-v1' || !Array.isArray(dataset.rows) || dataset.sourceUnits !== 'uGray/day' || dataset.channelLabel !== 'Total Dose E') throw new Error('Unrecognized NASA RAD data or units');
  const start = Date.parse(startDate+'T00:00:00Z'), end = Date.parse(endDate+'T00:00:00Z')+86400000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error('Choose a valid start and end date');
  const selected = dataset.rows.filter(r => {const t=Date.parse(r.timestamp);return t>=start&&t<end;});
  if(selected.length<2) throw new Error('This date range has fewer than two NASA observations');
  let previous=null, doseUGy=0, coveredMs=0, excludedIntervals=0, accepted=0, rejected=0;
  const series=[];
  for(const row of selected){
    const t=Date.parse(row.timestamp);
    if(!Number.isFinite(t)||previous&&t<=previous.t) throw new Error('NASA timestamps must be finite and strictly ordered');
    const valid=row.accepted===true && !row.qualityFlag && Number.isFinite(row.doseRateUGyPerDay) && row.doseRateUGyPerDay>=0 && row.doseRateUGyPerDay<=100000 && row.aliveTimeSeconds>0 && row.aliveTimeSeconds<=5000;
    if(valid)accepted++;else rejected++;
    let integrated=false;
    if(previous){
      const dt=t-previous.t;
      if(valid&&previous.valid&&dt<=45*60000){
        doseUGy+=(previous.rate+row.doseRateUGyPerDay)/2*dt/86400000;coveredMs+=dt;integrated=true;
      }else excludedIntervals++;
    }
    if(valid)series.push({t,value:doseUGy/1000,breakBefore:!integrated});
    previous={t,rate:row.doseRateUGyPerDay,valid};
  }
  if(series.length<2||coveredMs===0)throw new Error('Insufficient quality-controlled observations for this range');
  const span=Date.parse(selected.at(-1).timestamp)-Date.parse(selected[0].timestamp);
  return {kind:'nasa-rad',demo:false,source:dataset.title,sourceUnits:dataset.sourceUnits,detector:dataset.detector,
    doseMGy:doseUGy/1000,coveredDays:coveredMs/86400000,coveragePercent:100*coveredMs/span,
    meanDoseRateUGyPerDay:doseUGy/(coveredMs/86400000),gaps:excludedIntervals,accepted,rejected,
    observations:selected.length,periodStart:selected[0].timestamp,periodEnd:selected.at(-1).timestamp,series,
    provenance:Object.fromEntries(Object.entries(dataset).filter(([key])=>key!=='rows'))};
}
