"""Render installed reading events and remove only the measured pre-start frames."""
import argparse,subprocess,json,wave,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--java',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--captures',type=Path,required=True);a=p.parse_args()
if a.output.exists() or a.captures.exists():raise ValueError('Use fresh output and capture directories')
a.output.mkdir(parents=True);a.captures.mkdir(parents=True);manifest={'schema_version':1,'events':{},'provenance':[]}
for kind in ['Book','Magazine']:
 for operation in ['Open','Close','PageFlip']:
  name=operation+kind;raw=a.captures/(name+'.wav');event=f'event:/Character/Survival/Literature/{kind}/{operation}'
  result=subprocess.run(['python3',str(Path(__file__).parent/'adapters/render_fmod_event.py'),'--java',str(a.java),'--event',event,'--output',str(raw)],capture_output=True,text=True)
  (a.captures/(name+'.log')).write_text(result.stdout+result.stderr)
  if result.returncode:raise RuntimeError(result.stderr)
  data=json.loads(result.stdout)
  with wave.open(str(raw)) as source:
   if data['startDSPClock']>=source.getnframes():raise ValueError('Invalid capture origin')
   source.setpos(data['startDSPClock']);pcm=source.readframes(source.getnframes());params=source.getparams()
  with wave.open(str(a.output/(name+'.wav')),'wb') as dest:dest.setparams(params);dest.writeframes(pcm)
  manifest['events'][name]={'file':name+'.wav','event':event,'sampleRate':params.framerate,'channels':params.nchannels,'removedFrames':data['startDSPClock'],'frames':len(pcm)//(params.nchannels*params.sampwidth),'rawSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'sha256':hashlib.sha256((a.output/(name+'.wav')).read_bytes()).hexdigest()}
  manifest['provenance'].append(data)
(a.output/'manifest.json').write_text(json.dumps(manifest,indent=2))
