import {HeartRateSensor} from './heart-rate.mjs';
// Select kyto-ms only for the CREST-tested millisecond variant. Standard HRS uses bluetooth.
export class KytoSensor extends HeartRateSensor {
  constructor(options = {}) { super({...options, encoding: options.encoding || 'kyto-ms', hrOnly: false}); }
}
