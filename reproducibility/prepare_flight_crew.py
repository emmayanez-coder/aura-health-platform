"""Usage: python prepare_flight_crew.py path/to/5.zip path/to/dist/data/flight-crew-ecg.json
Download input from https://data.nasa.gov/docs/datasets/public/csm/5.zip
Uses Python standard library. The first 310 seconds of 5_CA.csv are selected
before inspecting signal quality; no favorable-result selection or resampling.
"""
import csv, hashlib, io, json, sys, zipfile
from pathlib import Path

archive=Path(sys.argv[1])
out=Path(sys.argv[2])
with zipfile.ZipFile(archive) as z:
    choices=[n for n in z.namelist() if n.rsplit('/',1)[-1].lower()=='5_ca.csv']
    if len(choices)!=1: raise ValueError('Expected exactly one 5_CA.csv')
    member=choices[0]
    raw=z.read(member)
reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
reader.fieldnames=[s.strip() for s in reader.fieldnames]
samples=[]
events={}
start=None
for row in reader:
    t=float(row['TimeSecs'])
    if start is None: start=t
    if t>start+310: break
    samples.append([t,float(row['ECG'])])
    event=row.get('Event','unknown')
    events[event]=events.get(event,0)+1
if len(samples)<256*300: raise ValueError('Excerpt too short')
data={'schema':'aura-flight-crew-ecg-v1','sampleRate':256,'samples':samples,
      'provenance':{'catalog':'https://data.nasa.gov/dataset/flight-crew-physiological-data-for-crew-state-monitoring',
      'archiveUrl':'https://data.nasa.gov/docs/datasets/public/csm/5.zip',
      'descriptionUrl':'https://data.nasa.gov/docs/datasets/public/csm/description.txt',
      'archiveSHA256':hashlib.sha256(archive.read_bytes()).hexdigest(),
      'member':member,'memberSHA256':hashlib.sha256(raw).hexdigest(),
      'columns':['TimeSecs','ECG'],'startSeconds':samples[0][0],'endSeconds':samples[-1][0],
      'selection':'First 310 seconds of subject 5 CA ground benchmark, selected before signal inspection',
      'transformation':'Parse original decimal TimeSecs and ECG values to JSON numbers; no resampling or filtering in excerpt',
      'eventCounts':events,'accessed':'2026-11-14','credit':'NASA Langley Research Center; dataset maintainer Angela Harrivel',
      'limits':'One subject, one ground task; event labels are not R-peak ground truth. No spaceflight or personal readiness validation.'}}
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
print(json.dumps({k:v for k,v in data.items() if k!='samples'},indent=2))
print('Samples:',len(samples))
