import {HeartRateSensor} from './heart-rate.mjs';
// Huawei's tested broadcast supplies HR. Never synthesize intervals or HRV from BPM.
export class HuaweiSensor extends HeartRateSensor {
  constructor(options = {}) { super({...options, encoding: 'bluetooth', hrOnly: true}); }
}
