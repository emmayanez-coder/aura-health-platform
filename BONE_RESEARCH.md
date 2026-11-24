# AURA v0.3 — NASA bone research reference

The editable exponential curve has been replaced by two fixed rate scenarios derived from NASA's published 1–2% monthly loss reference in the absence of effective countermeasures.

Sources:
- https://www.nasa.gov/glenn/glenn-expertise-space-exploration/human-health-performance/computational-modeling/musculoskeletal/
- https://www.nasa.gov/directorates/esdmd/hhp/bone-and-mineral-evaluation-and-analysis/

NASA supplies the rate reference and hip/spine context. AURA supplies the linear projection, normalized baseline, 30-day month and 180-day display cap. This is not an implementation of NASA's computational bone-remodeling model and does not use individual astronaut records. The cap is a product scope decision, not evidence of validation. The reference does not characterize modern ARED outcomes.

Calculation: index = 100 − rate × days / 30. At day 180 the two indices are 88 and 94. Their shaded span is not a statistical confidence or prediction interval. It is not measured BMD, a percentage of total bone health, or a fracture-risk estimate. No individualized effect is inferred from wearable activity, nutrition, medication or radiation. Partial gravity and postflight recovery are outside scope.

The exported personal record now includes the selected day, result, complete trajectory and model provenance under boneReference. Baseline import continues to import resting physiology only; it does not restore the mission scenario.

Daily Readiness and sensor code are unchanged. No combined validated Mission Health Score is introduced. NASA radiation remains a separately labeled historical Mars observation series; the bone reference describes microgravity, not the same Mars environment.

Verification: node test.mjs; node test-nasa.mjs; node test-ui.mjs; node test-bone.mjs.
