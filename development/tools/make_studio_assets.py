"""Generate legacy isometric catalogue views from the same original volume recipes.
These are intentionally simple dimensional previews, not finished PZ-quality textures.
"""
from pathlib import Path
import json, subprocess, math
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
script="""import fs from 'node:fs';import {studioFurnitureVolume} from './src/studio-furniture-volume.js';const paths=fs.readdirSync('assets/recipes/volume').filter(s=>s.startsWith('studio-')&&s.endsWith('.json')).sort((a,b)=>{const tail=['studio-office-chair.json','studio-storage-bed.json','studio-nightstand.json','studio-water-glass.json'];return (tail.includes(a)?100+tail.indexOf(a):0)-(tail.includes(b)?100+tail.indexOf(b):0)||a.localeCompare(b);});console.log(JSON.stringify(paths.map(p=>{const recipe=JSON.parse(fs.readFileSync('assets/recipes/volume/'+p));return {recipe,geometry:studioFurnitureVolume(recipe)};})));"""
assets=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True))
regions={};properties={};sprites=[]
labels={'storage-bed':'Storage bed','nightstand':'Bedside drawers','water-glass':'Glass of water','office-chair':'Office chair','upright-piano':'Upright piano','piano-bench':'Piano bench','workstation':'MacBook workstation','media-console':'Media console','television-85':'85-inch television','floor-speaker':'Floorstanding speaker','functional-trainer':'Functional trainer','breakfast-bar':'Breakfast bar','bar-stool':'Bar stool','sectional-sofa':'L-shaped sofa'}
for a in assets:
 r=a['recipe'];kind=r['parameters']['kind'];w,d=r['placement']['cells'];footprint=r['placement'].get('footprint',[[x,y] for y in range(d) for x in range(w)])
 for facing in ['S','E','N','W']:
  transform=lambda x,y: (x,y) if facing=='S' else (d-y,x) if facing=='E' else (w-x,d-y) if facing=='N' else (y,w-x)
  layout=r['sourceLayout'][facing];image=Image.new('RGBA',(320,256));draw=ImageDraw.Draw(image)
  faces=[]
  for part in a['geometry']['parts']:
   vv=[(*transform(v[0],v[1]),v[2]) for v in part['vertices']];color=r['materials'][part['materialId']]['color'];rgb=[(color>>s)&255 for s in [16,8,0]]
   for i in range(0,len(part['indices']),3):
    tri=[vv[j] for j in part['indices'][i:i+3]];u=[tri[1][j]-tri[0][j] for j in range(3)];v=[tri[2][j]-tri[0][j] for j in range(3)];n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];length=math.sqrt(sum(x*x for x in n));n=[x/(length or 1) for x in n]
    if sum(n[j]*[1,1,1.5][j] for j in range(3))<=0:continue
    shade=.65+.25*max(0,n[2])+.1*max(0,n[0]);points=[(128+(x-y)*32,160+(x+y)*16-z*32) for x,y,z in tri];faces.append((sum(x+y+z*.8 for x,y,z in tri)/3,points,tuple(round(c*shade) for c in rgb)))
  for _,points,color in sorted(faces,key=lambda f:f[0]):draw.polygon(points,fill=color)
  for j,p in enumerate(layout):
   tile=p['tile'];index=len(sprites);sprites.append(image.copy() if j==0 else Image.new('RGBA',(320,256)))
   regions[tile]=dict(page='original-studio.png',x=(index%4)*320,y=(index//4)*256,w=320,h=256,ox=-96-p['dx']*32+p['dy']*32,oy=-64-(p['dx']+p['dy'])*16,scale=1)
   props=dict(CustomName=labels[kind],GroupName='Studio',Facing=facing,IsMoveAble='',SpriteGridPos=f"{p['dx']},{p['dy']}",TianVariantFamily='studio-'+kind,TianPrefabAnchor='true' if j==0 else 'false',BlocksPlacement='',solidtrans='')
   if kind in ['media-console','workstation','breakfast-bar']:props.update(IsTable='',Surface=str({'media-console':.475,'workstation':.765,'breakfast-bar':.925}[kind]*32))
   if kind=='workstation':props.update(TianComputer='true')
   if kind=='media-console':props.update(container='shelves',ContainerCapacity='30')
   if kind=='breakfast-bar':props.update(container='counter',ContainerCapacity='30',TianEmptyContainer='true')
   if kind in ['sectional-sofa','piano-bench','bar-stool','office-chair']:props.update(BedType='badBed')
   if kind=='storage-bed':props.update(BedType='goodBed',TianStorage='wardrobe',ContainerCapacity='35',TianEmptyContainer='true')
   if kind=='nightstand':props.update(container='shelves',ContainerCapacity='12',TianEmptyContainer='true',IsTable='',Surface=str(.575*32))
   if kind=='water-glass':props.pop('solidtrans');props.update(TianMount='table')
   if kind=='piano-bench':props.update(TianStorage='shelves',ContainerCapacity='8',TianEmptyContainer='true')
   if kind=='television-85':props.pop('solidtrans');props.update(TianMount='table',TV='',signal='tv')
   properties[tile]=props
sheet=Image.new('RGBA',(1280,math.ceil(len(sprites)/4)*256))
for i,s in enumerate(sprites):sheet.paste(s,((i%4)*320,(i//4)*256))
sheet.save(ROOT/'private-assets/original-studio.png')
data=json.dumps(dict(regions=regions,properties=properties),separators=(',',':'))
(ROOT/'src/studio-assets.js').write_text('// Generated from studio volume recipes.\nconst data='+data+';\nexport function installStudioAssets(properties,atlas){Object.assign(properties,data.properties);Object.assign(atlas.regions,data.regions);}\n')
print(f'Created {len(sprites)} studio catalogue regions')
