"""Rebuild AURA's NASA RAD subset from the seven original NASA CDF files.
Requires Python 3, cdflib==1.3.16 and numpy. Run from this directory.
No modeled or interpolated observations are added to the output.
"""
from pathlib import Path
import hashlib, json
import numpy as np
import cdflib

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'dist' / 'data' / 'nasa-rad-20240101-20240107.json'
BASE = 'https://spdf.gsfc.nasa.gov/pub/data/aaa_planetary/msl/rad/cdf/obs-l2/2024/'
rows, sources = [], []
for day in range(1, 8):
    name = f'msl_rad_obs-l2_2024{day:03d}_v04.cdf'
    path = HERE / 'raw' / name
    c = cdflib.CDF(path)
    attrs = c.varattsget('DOSIMETRY_TOTAL')
    labels = list(c.varget('DOSIMETRY_OBS_LABEL'))
    assert attrs['UNITS'] == 'uGray/day', 'Unexpected source units'
    channel = labels.index('Total Dose E')
    times = cdflib.cdfepoch.to_datetime(c.varget('EPOCH'))
    rates = c.varget('DOSIMETRY_TOTAL')[:, channel]
    flags = c.varget('FLAGGED_DATA')
    alive = c.varget('ALIVE_TIME')
    for t, rate, flag, seconds in zip(times, rates, flags, alive):
        flag = str(flag).strip()
        reasons = []
        if flag: reasons.append('FLAGGED_DATA: ' + flag)
        if not np.isfinite(rate) or not float(attrs['VALIDMIN']) <= rate <= float(attrs['VALIDMAX']): reasons.append('dose rate outside valid range')
        if not np.isfinite(seconds) or not 0 < seconds <= 5000: reasons.append('invalid ALIVE_TIME')
        rows.append({'timestamp': str(t.astype('datetime64[ms]')) + 'Z',
                     'doseRateUGyPerDay': float(rate) if np.isfinite(rate) and rate >= 0 else None,
                     'accepted': not reasons, 'qualityFlag': flag, 'rejectionReasons': reasons,
                     'aliveTimeSeconds': float(seconds), 'sourceFile': name})
    sources.append({'file': name, 'url': BASE + name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                    'records': len(times), 'sourceDataVersion': '04'})
rows.sort(key=lambda r: r['timestamp'])
assert len(set(r['timestamp'] for r in rows)) == len(rows), 'Duplicate timestamps require review'
data = {
    'schema': 'aura-nasa-rad-v1', 'title': 'MSL Curiosity RAD Level 2 — Detector E',
    'catalogUrl': 'https://data.nasa.gov/dataset/mars-science-laboratory-msl-radiation-assessment-detector-rad-level-2-observation-dosimetr',
    'archiveUrl': BASE, 'mission': 'Mars Science Laboratory / Curiosity',
    'instrument': 'Radiation Assessment Detector (RAD)', 'detector': 'E — tissue-equivalent plastic',
    'variable': 'DOSIMETRY_TOTAL', 'channelLabel': 'Total Dose E', 'channelIndexZeroBased': 2,
    'sourceUnits': 'uGray/day', 'normalizedUnits': 'microgray per Earth day',
    'timeVariable': 'EPOCH', 'sourceTimeType': 'CDF_TIME_TT2000',
    'timeConversion': 'cdflib.cdfepoch.to_datetime; UTC, millisecond representation',
    'retrievedOn': '2026-11-14', 'periodStart': rows[0]['timestamp'], 'periodEnd': rows[-1]['timestamp'],
    'qualityPolicy': 'Keep only empty FLAGGED_DATA, finite dose rate within source VALIDMIN/VALIDMAX (0–100000 uGy/day), and 0 < ALIVE_TIME <= 5000 s. Rejected rows are retained with reasons to prevent integration across them.',
    'integrationPolicy': 'Trapezoidal estimate between adjacent accepted observations, maximum separation 45 minutes. No interpolation across a rejected observation. No extrapolation beyond first/last observations. Convert uGy to mGy by dividing by 1000.',
    'maxGapMinutes': 45, 'sourceFiles': sources,
    'acknowledgement': 'RAD Principal Investigator Dr. Donald M. Hassler, Southwest Research Institute, Boulder; RAD instrument team; NASA/JPL Mars Science Laboratory; NASA SPDF/CDAWeb archive.',
    'rulesOfUse': 'The source CDF describes the RAD data as fully citable and asks users to consult the RAD team for further processing/usage details.',
    'limitations': 'Historical rover-detector absorbed dose rate on Mars. Not live radiation, not a personal dosimeter, not effective dose in mSv, not a medical risk estimate. AURA integration is an approximate covered-interval estimate, not a mission-total dose.',
    'processingSoftware': {'cdflib': cdflib.__version__, 'numpy': np.__version__},
    'rows': rows
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False)+'\n', encoding='utf-8')
print(json.dumps({'rows':len(rows),'accepted':sum(r['accepted'] for r in rows),'rejected':sum(not r['accepted'] for r in rows),'first':data['periodStart'],'last':data['periodEnd'],'output':str(OUT)}))
