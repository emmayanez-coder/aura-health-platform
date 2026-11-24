// Pure BLE Heart Rate Measurement parser. No UI, transport, or synthetic readings.
export function decodeHeartRate(view, encoding = 'bluetooth') {
  if (!(view instanceof DataView)) throw new Error('Expected a BLE DataView');
  if (!['bluetooth', 'kyto-ms'].includes(encoding)) throw new Error('Unknown RR encoding');
  if (view.byteLength < 2) throw new Error('Truncated heart-rate packet');
  const flags = view.getUint8(0);
  let offset = 1;
  const need = n => { if (offset + n > view.byteLength) throw new Error('Truncated heart-rate packet'); };
  need(flags & 1 ? 2 : 1);
  const hr = flags & 1 ? view.getUint16(offset, true) : view.getUint8(offset);
  offset += flags & 1 ? 2 : 1;
  if (flags & 8) { need(2); offset += 2; }
  const rr = [];
  if (flags & 16) {
    if (offset === view.byteLength || (view.byteLength - offset) % 2) throw new Error('Malformed RR field');
    while (offset < view.byteLength) {
      const raw = view.getUint16(offset, true); offset += 2;
      rr.push(encoding === 'kyto-ms' ? raw : raw * 1000 / 1024);
    }
  } else if (offset !== view.byteLength) throw new Error('Unexpected packet bytes');
  return {hr, rr, contact: flags & 4 ? Boolean(flags & 2) : null};
}

export class SignalWindow {
  constructor() { this.clear(); }
  clear() { this.hr = []; this.rr = []; this.previous = null; this.lastPacket = null; this.segment = 0; this.rejected = 0; }
  interrupt() { this.previous = null; this.segment++; }
  add(packet, now) {
    if (this.lastPacket !== null && now - this.lastPacket > 5000) this.interrupt();
    this.lastPacket = now;
    if (packet.contact === false || !Number.isFinite(packet.hr) || packet.hr < 35 || packet.hr > 220) {
      this.rejected++; this.interrupt(); return false;
    }
    this.hr.push({t: now, value: packet.hr, segment: this.segment});
    // HRS has no per-beat timestamps: reconstruct approximate beat times backwards from receipt.
    // Never claim these are sensor acquisition timestamps.
    let end = now - packet.rr.reduce((s, x) => s + x, 0);
    for (const ms of packet.rr) {
      end += ms;
      if (!Number.isFinite(ms) || ms < 300 || ms > 1500 || (this.previous !== null && Math.abs(ms - this.previous) / this.previous > .25)) {
        this.rejected++; this.interrupt(); continue;
      }
      const last = this.rr.at(-1);
      if (last && end <= last.t) { this.rejected++; this.interrupt(); continue; }
      this.rr.push({t: end, ms, segment: this.segment}); this.previous = ms;
    }
    this.hr = this.hr.filter(x => x.t >= now - 310000);
    this.rr = this.rr.filter(x => x.t >= now - 310000);
    return true;
  }
  summary(now, seconds = 60, start = now - seconds * 1000) {
    const hr = this.hr.filter(x => x.t >= start && x.t <= now);
    const rr = this.rr.filter(x => x.t - x.ms >= start && x.t <= now);
    let hrCoverage = 0, hrIntegral = 0, sum = 0, pairs = 0, rrCoverage = 0;
    for (let i = 1; i < hr.length; i++) {
      const dt = hr[i].t - hr[i-1].t;
      if (dt > 0 && dt <= 5000 && hr[i].segment === hr[i-1].segment) { hrCoverage += dt; hrIntegral += dt * (hr[i].value + hr[i-1].value) / 2; }
    }
    for (let i = 0; i < rr.length; i++) {
      rrCoverage += rr[i].ms;
      if (i && rr[i].segment === rr[i-1].segment && rr[i].t - rr[i-1].t <= 5000) {
        sum += (rr[i].ms - rr[i-1].ms) ** 2; pairs++;
      }
    }
    const freshHr = hr.length && now - hr.at(-1).t <= 5000;
    const freshRr = rr.length && now - rr.at(-1).t <= 5000;
    return {
      hr: freshHr && hrCoverage >= seconds * 800 ? hrIntegral / hrCoverage : null,
      rmssd: freshRr && pairs >= 20 && rrCoverage >= seconds * 800 ? Math.sqrt(sum / pairs) : null,
      hrCoverage: Math.min(1, hrCoverage / (seconds * 1000)),
      rrCoverage: Math.min(1, rrCoverage / (seconds * 1000)), pairs, rejected: this.rejected
    };
  }
}

export class HeartRateSensor {
  constructor({encoding = 'bluetooth', hrOnly = false, onReading = () => {}, onStatus = () => {}} = {}) {
    Object.assign(this, {encoding, hrOnly, onReading, onStatus});
    this.notification = e => {
      try {
        const packet = decodeHeartRate(e.target.value, this.encoding);
        if (this.hrOnly) packet.rr = [];
        this.onReading({...packet, receivedAt: Date.now(), deviceKey: this.device.id + ':' + this.encoding, deviceName: this.device.name || 'Heart-rate sensor'});
      } catch (e) { this.onStatus('packet-error', e.message); }
    };
    this.disconnected = () => this.onStatus('disconnected', 'Sensor disconnected. Reconnect to resume.');
  }
  async connect() {
    if (!globalThis.navigator?.bluetooth) throw new Error('Open AURA in Chrome or Edge on Windows, or Chrome on Android, for Bluetooth.');
    if (!globalThis.isSecureContext) throw new Error('Bluetooth needs HTTPS or localhost.');
    this.device = await navigator.bluetooth.requestDevice({acceptAllDevices: true, optionalServices: ['heart_rate']});
    this.device.addEventListener('gattserverdisconnected', this.disconnected);
    try {
      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      this.characteristic = await service.getCharacteristic('heart_rate_measurement');
      this.characteristic.addEventListener('characteristicvaluechanged', this.notification);
      await this.characteristic.startNotifications();
      this.onStatus('connected', this.device.name || 'Heart-rate sensor');
    } catch (e) { this.disconnect(); throw e; }
  }
  disconnect() {
    this.characteristic?.removeEventListener('characteristicvaluechanged', this.notification);
    this.device?.removeEventListener('gattserverdisconnected', this.disconnected);
    if (this.device?.gatt.connected) this.device.gatt.disconnect();
    this.onStatus('disconnected', 'Disconnected');
  }
}
