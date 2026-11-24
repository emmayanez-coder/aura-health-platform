// NASA supplies the rate reference; the linear projection is an AURA assumption.
export const BONE_REFERENCE = Object.freeze({
  id: 'aura-nasa-bone-reference-v1',
  kind: 'research-reference-not-personal-prediction',
  ratePercentPerMonth: Object.freeze([1, 2]),
  monthDays: 30,
  maxDays: 180,
  context: 'Microgravity without effective countermeasures; hip/spine research context',
  formula: 'index = 100 - ratePercentPerMonth * days / 30',
  assumptions: 'Linear change relative to an indexed baseline of 100; 30-day month; 180-day display cap is an AURA scope limit, not a validated prediction horizon.',
  limitations: 'Not a confidence interval, measured BMD, fracture-risk estimate, or individual forecast. Not calibrated for modern ARED, lunar/Mars gravity, recovery, nutrition or medication. Exercise adherence does not alter these rates. Excluded from readiness scoring.',
  sources: Object.freeze([
    {title: 'NASA: Musculoskeletal', url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/human-health-performance/computational-modeling/musculoskeletal/', supports: '1–2% monthly bone-density loss without effective countermeasures'},
    {title: 'NASA: Bone and Mineral Evaluation and Analysis', url: 'https://www.nasa.gov/directorates/esdmd/hhp/bone-and-mineral-evaluation-and-analysis/', supports: 'Hip/spine context and pre/post-flight DXA monitoring'}
  ]),
  accessed: '2026-11-14'
});
export function boneReference(days) {
  if (typeof days !== 'number' || !Number.isFinite(days) || days < 0 || days > BONE_REFERENCE.maxDays) throw new RangeError('Bone reference supports 0–180 days only');
  const at = day => ({day, lower: 100 - 2 * day / 30, upper: 100 - day / 30});
  return {model: BONE_REFERENCE, days, ...at(days), lossPercent: {lower: days / 30, upper: 2 * days / 30}, series: Array.from({length: 31}, (_, i) => at(days * i / 30))};
}
