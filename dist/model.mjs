export const median = a => { const b = [...a].sort((x,y) => x-y); const n=b.length; return n ? (b[Math.floor(n/2)] + b[Math.ceil(n/2)-1])/2 : null; };
const mad = a => { const m = median(a); return median(a.map(v => Math.abs(v-m))); };
export function validateRecords(records) {
  if (!Array.isArray(records) || records.length > 5000) throw new Error('Expected up to 5000 baseline records');
  return records.map(r => {
    if (!r || typeof r.deviceKey !== 'string' || !r.deviceKey || r.durationSeconds !== 300 || r.context !== 'resting' || r.demo !== false || !Number.isFinite(Date.parse(r.measuredAt)) || !Number.isFinite(r.hrBpm) || r.hrBpm < 35 || r.hrBpm > 220 || (r.rmssdMs !== null && (!Number.isFinite(r.rmssdMs) || r.rmssdMs <= 0 || r.rmssdMs > 1000))) throw new Error('Invalid baseline record. Use exported AURA 5-minute resting records.');
    return r;
  });
}
export function makeBaseline(records, deviceKey, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0,10);
  const days = new Map();
  for (const r of records) {
    const age = now - Date.parse(r.measuredAt), day = r.measuredAt.slice(0,10);
    if (r.deviceKey !== deviceKey || age < 0 || age > 28*86400000 || day >= today) continue;
    if (!days.has(day)) days.set(day, []); days.get(day).push(r);
  }
  const hr = [], hrv = [];
  for (const rows of days.values()) {
    hr.push(median(rows.map(r => r.hrBpm)));
    const values = rows.filter(r => r.rmssdMs > 0).map(r => Math.log(r.rmssdMs));
    if (values.length) hrv.push(median(values));
  }
  return {validDays: hr.length, hrvValidDays: hrv.length, hrMedian: median(hr), hrMad: mad(hr), logRmssdMedian: median(hrv), logRmssdMad: mad(hrv)};
}
export function integrateRadiation(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines[0]?.trim() !== 'timestamp,dose_rate_uGy_per_day') throw new Error('CSV header must be timestamp,dose_rate_uGy_per_day');
  if (lines.length > 20001) throw new Error('Maximum 20000 rows');
  const rows = lines.slice(1).filter(Boolean).map(line => {
    const cells = line.split(',');
    const t = Date.parse(cells[0]), rate = Number(cells[1]);
    if (cells.length !== 2 || !cells[1].trim() || !Number.isFinite(t) || !Number.isFinite(rate) || rate < 0) throw new Error('Invalid radiation timestamp or rate');
    return {t, rate};
  }).sort((a,b)=>a.t-b.t);
  if (rows.length < 2) throw new Error('At least two radiation observations are required');
  let dose = 0, gaps = 0, coveredDays = 0;
  const series = [{t:rows[0].t,value:0}];
  for (let i=1;i<rows.length;i++) {
    const days = (rows[i].t-rows[i-1].t)/86400000;
    if (days === 0) throw new Error('Duplicate radiation timestamp');
    if (days > 1.5) gaps++;
    else { dose += (rows[i].rate+rows[i-1].rate)/2*days; coveredDays += days; }
    series.push({t:rows[i].t,value:dose/1000});
  }
  return {doseMGy:dose/1000, coveredDays, gaps, series};
}
