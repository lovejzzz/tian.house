"""Convert installed vehicle geometry and skin variants for the creative workshop.
Static placement only; driving/parts animation are separate runtime obligations.
"""
import json,re,subprocess,shutil,hashlib
from pathlib import Path
from import_characters import blocks,nums,mesh_file
MEDIA=Path('/Users/tianxing/Library/Application Support/Steam/steamapps/common/ProjectZomboid/Project Zomboid.app/Contents/Java/media')
OUT=Path(__file__).parent/'private-assets/workshop-vehicles'

def props(s):
 depth=0;flat=''
 for c in s:
  if c=='{':depth+=1
  elif c=='}':depth-=1
  elif not depth:flat+=c
 return dict(re.findall(r'(?m)^\s*([\w!]+)\s*=\s*([^,\r\n]+)',flat))
def main():
 OUT.mkdir(exist_ok=True)
 templates={};vehicles={};models={}
 for p in sorted((MEDIA/'scripts/generated/vehicles').rglob('*.txt')):
  s=p.read_text()
  for n,b,*_ in blocks(s,r'template\s+vehicle'):templates[n]=b
  for n,b,*_ in blocks(s,'vehicle'):vehicles[n]=b
  for n,b,*_ in blocks(s,'model'):
   if n:models[n]=props(b)
 def resolve(body,seen=()):
  combined=''
  for ref in re.findall(r'(?m)^\s*template!?\s*=\s*([^,\n]+)',body):
   ref=ref.strip()
   if '/' not in ref and ref in templates and ref not in seen:combined+=resolve(templates[ref],seen+(ref,))+'\n'
  return combined+'\n'+body
 files={p.relative_to(MEDIA).as_posix().lower():p for p in (MEDIA/'textures').rglob('*.png')};converted={};failures=[];entries=[]
 for name,body in vehicles.items():
  b=resolve(body);mb=list(blocks(b,'model'));skins=list(blocks(b,'skin'))
  if not mb or not skins:failures.append({'id':name,'reason':'No resolved body model or skin'});continue
  mp=props(mb[-1][1]);model=models.get(mp.get('file',''));vp=props(b)
  if not model or not model.get('mesh'):failures.append({'id':name,'reason':'Model definition missing'});continue
  modelname=mp['file'];mesh=MEDIA/'models_X'/(model['mesh']+'.fbx')
  try:
   if modelname not in converted:
    target=OUT/(modelname+'.json')
    if not target.exists():
     if mesh.exists():data=json.loads(subprocess.check_output(['node',str(Path(__file__).with_name('import_static_fbx.mjs')),str(mesh)],text=True,stderr=subprocess.PIPE))
     else:
      mesh=mesh.with_suffix('.x');data=mesh_file(mesh)
     target.write_text(json.dumps({'meshes':data['meshes'],'scale':float(model.get('scale',1)),'source':mesh.name},separators=(',',':')))
    converted[modelname]=target.name
   unique=set()
   for _,skin,*_ in skins:
    tex=props(skin).get('texture');texture=files.get(('textures/'+str(tex)+'.png').lower())
    if not texture or tex in unique:continue
    unique.add(tex);dest=texture.name
    if not (OUT/dest).exists():shutil.copy2(texture,OUT/dest)
    wheels={}
    for wheel_name,wheel_body,*_ in blocks(b,'wheel'):
     wheel=props(wheel_body)
     if 'offset' in wheel:wheels[wheel_name]={'offset':nums(wheel['offset']),'radius':float(wheel.get('radius',.15)),'width':float(wheel.get('width',.2))}
    entries.append({'wheels':list(wheels.values()),'id':name+':'+str(len(unique)),'name':re.sub(r'(?<=[a-z])(?=[A-Z])',' ',name),'model':converted[modelname],'texture':dest,'scale':float(mp.get('scale',1)),'offset':nums(mp.get('offset','0 0 0')),'extents':nums(vp.get('extents','1 1 3')),'vehicle':name})
   if not unique:failures.append({'id':name,'reason':'Skin textures unavailable'})
  except Exception as e:failures.append({'id':name,'reason':str(e)[:200]})
 # The installed legacy wheel file stores position/normal/UV on three rows.
 wheel_text=(MEDIA/'models/Vehicles_Wheel.txt').read_text()
 rows=wheel_text.split('# Vertex Buffer:')[1].split('# Number of Faces:')[0].strip().splitlines()
 count=int(wheel_text.split('# Vertex Count:')[1].split('#')[0].strip())
 vertices=[];uvs=[]
 for i in range(count):vertices+=nums(rows[i*3]);uvs+=nums(rows[i*3+2])
 faces=wheel_text.split('# Face Data:')[1].split('#')[0]
 (OUT/'wheel.json').write_text(json.dumps({'meshes':[{'vertices':vertices,'uvs':uvs,'indices':[int(v) for v in nums(faces)]}]},separators=(',',':')))
 shutil.copy2(MEDIA/'textures/Vehicles/vehicle_wheel.png',OUT/'wheel.png')
 manifest={'schema_version':1,'source_version':'42.21.0','kind':'source-static','entries':entries,'failures':failures,'models':len(converted),'scope':'Static workshop placement with wheels; source shader, part state and driving fidelity pending'}
 (OUT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')))
 print(json.dumps({'vehicles':len(vehicles),'entries':len(entries),'models':len(converted),'failures':len(failures)}))

if __name__=='__main__':main()
