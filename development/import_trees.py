"""Infer initial trees using installed source noise/RNG and read-only local seeds.
Not source world/season parity evidence. Requires javac and the bundled source JRE.
"""
import argparse,hashlib,json,subprocess,tempfile,platform
from pathlib import Path
HERE=Path(__file__).resolve().parent

def main():
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--erosion-config',type=Path,required=True);p.add_argument('--world',type=Path,default=HERE/'private-assets/world');p.add_argument('--output',type=Path,default=HERE/'private-assets/trees');a=p.parse_args()
 if a.output.exists():raise SystemExit('Output exists; use a fresh --output directory')
 home=a.source/'Project Zomboid.app/Contents';arch='aarch64' if platform.machine()=='arm64' else 'x86_64';java=home/f'PlugIns/jre-{arch}/Contents/Home/bin/java';jars=home/'Java';jar=jars/'projectzomboid.jar'
 cells={};rows=[]
 for file in sorted(a.world.glob('*.json')):
  if file.stem in ('manifest','properties'):continue
  d=json.loads(file.read_text());cx,cy=map(int,file.stem.split('_'));data={};cells[file.stem]=data
  for row in d['squares']:
   x,y,z,_room,*ids=row
   if z!=0:continue
   for i in ids:
    name=d['names'][i]
    if name.startswith(('vegetation_trees','jumbo_tree_01')):
     wx,wy=x+cx*256,y+cy*256;rows.append(f'{wx}\t{wy}\t{name}');data[f'{wx},{wy},0:{name}']=None
 with tempfile.TemporaryDirectory(prefix='sre-tree-') as temp:
  temp=Path(temp);(temp/'input.tsv').write_text('\n'.join(rows)+'\n');adapter=HERE/'adapters/TreeProbe.java'
  subprocess.run(['javac','-d',str(temp),str(adapter)],check=True)
  subprocess.run([str(java),'--class-path',str(temp)+':'+str(jars/'*'),'TreeProbe',str(a.erosion_config.resolve()),str(temp/'input.tsv'),str(temp/'output.tsv')],check=True)
  for line in (temp/'output.tsv').read_text().splitlines():
   x,y,name,tileset,evergreen,stage,soil,noise=line.split('\t');x,y,stage=int(x),int(y),int(stage)
   cells[f'{x//256}_{y//256}'][f'{x},{y},0:{name}']={'tileset':tileset,'evergreen':evergreen=='true','stage':stage,'soil':int(soil),'noise':int(noise)}
  if any(v is None for c in cells.values() for v in c.values()):raise ValueError('Incomplete source-component output')
  a.output.mkdir(parents=True)
  for cell,data in cells.items():(a.output/(cell+'.json')).write_text(json.dumps(data,separators=(',',':')))
  manifest={'schema_version':1,'count':len(rows),'provenance':'source-component execution + inferred initial world sequence','source_jar_sha256':hashlib.sha256(jar.read_bytes()).hexdigest(),'erosion_config_sha256':hashlib.sha256(a.erosion_config.read_bytes()).hexdigest(),'adapter_sha256':hashlib.sha256(adapter.read_bytes()).hexdigest(),'limitations':['Assumes initial single-player category sequence and staticRand=false','No source-world tree captures at matching coordinates yet','Season blending, snow, erosion progression and chopping not implemented']}
  (a.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
