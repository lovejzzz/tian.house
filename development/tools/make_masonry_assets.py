"""Deterministic original masonry surfaces and standard opening surrounds."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, math, random
ROOT=Path(__file__).resolve().parents[1]
regions={};props={};sprites=[]
styles=[('navy','Deep blue painted brick',(38,65,88),(30,51,67)),('chalk','Chalk painted brick',(204,204,193),(170,175,166)),('weathered','Weathered plaster and brick',(148,133,106),(115,110,94)),('umber','Warm umber plaster',(88,70,61),(88,70,61)),('ivory','Ivory plaster',(213,211,198),(213,211,198)),('ribbed','Dark ribbed masonry',(69,58,56),(107,105,92))]
# A four-cell source field: adjacent panels share texture coordinates instead of
# repeating a conspicuous vertical scar every tile. Keep the original material ID.
weather=Image.new('RGB',(256,192),(185,176,156));wd=ImageDraw.Draw(weather)
wr=random.Random('tian-weathered-span-v2')
for row,y in enumerate(range(-7,192,7)):
 for x in range(-24 if row%2 else -12,256,24):
  t=wr.randint(-10,10);wd.rectangle((x,y,x+22,y+5),fill=(158+t,145+t,119+t))
for y in range(192):
 for x in range(256):
  # Broad peeled areas, chipped repair boundaries and a worn lintel band.
  boundary=34+10*math.sin(x*.035)+5*math.sin(x*.13)
  field=math.sin(x*.025+y*.024)+.47*math.sin(x*.071-y*.033)+.18*math.sin(x*.39+y*.31)
  exposed=(y<boundary and y>boundary-13) or field>.92
  if not exposed:
   grain=wr.choice([-4,-2,0,0,1,3]);shade=round(5*math.sin(x*.04+y*.018))
   weather.putpixel((x,y),(196+grain+shade,194+grain+shade,182+grain+shade))
for j in range(75):
 x,y=wr.randrange(256),wr.randrange(192)
 wd.line((x,y,x+wr.randrange(2,12),y+wr.choice([-1,0,1])),fill=wr.choice([(173,173,159),(208,206,193)]))
styles += [('weathered_'+str(i),'Weathered plaster and brick · panel '+str(i+1),(148,133,106),(115,110,94)) for i in range(1,4)]
# Reusable exposed substrate: masonry courses and irregular remaining render.
stripped=Image.new('RGB',(256,192),(147,144,127));sd=ImageDraw.Draw(stripped)
sr=random.Random('tian-stripped-render-v1')
for row,y in enumerate(range(-12,192,15)):
 for x in range(-18 if row%2 else -3,256,31):
  tone=sr.randint(-18,18)
  sd.rectangle((x+1,y+1,x+29,y+13),fill=(175+tone,166+tone,141+tone))
  sd.line((x+2,y+1,x+28,y+1),fill=(194+tone,186+tone,164+tone))
for y in range(192):
 for x in range(256):
  field=math.sin(x*.085+y*.039)+.65*math.sin(x*.17-y*.077)+.22*math.sin(x*.69+y*.41)
  if field>.15:
   grain=sr.randint(-9,9);stripped.putpixel((x,y),(192+grain,191+grain,177+grain))
  elif field>-.08:
   grain=sr.randint(-12,8);stripped.putpixel((x,y),(143+grain,144+grain,132+grain))
styles += [('stripped_'+str(i),'Exposed masonry and render · panel '+str(i+1),(175,166,141),(147,144,127)) for i in range(4)]
styles += [('navy_lintel','Blue brick with weathered lintel',(38,65,88),(30,51,67))]
for style,label,base,mortar in styles:
 rng=random.Random('tian-masonry-'+style)
 texture=Image.new('RGB',(64,192),mortar);td=ImageDraw.Draw(texture)
 for row,y in enumerate(range(-7,192,7)):
  for x in range(-24 if row%2 else -12,64,24):
   tone=rng.randint(-7,7);col=tuple(max(0,min(255,c+tone)) for c in base)
   td.rectangle((x,y,x+22,y+5),fill=col)
   td.line((x,y,x+22,y),fill=tuple(min(255,c+5) for c in col))
 if style=='ribbed':
  for x in range(2,64,4):td.line((x,0,x,191),fill=(92,83,75))
 if style in ['umber','ivory']:
  # Continuous plaster, not a brick pattern painted brown or white.
  texture=Image.new('RGB',(64,192),base);td=ImageDraw.Draw(texture)
  for i in range(80):
   x,y=rng.randrange(64),rng.randrange(192);tone=rng.choice([-2,-1,1,2]);td.line((x,y,x+rng.randrange(1,5),y),fill=tuple(c+tone for c in base))
 if style.startswith('weathered'):
  panel=0 if style=='weathered' else int(style.rsplit('_',1)[1])
  texture=weather.crop((panel*64,0,(panel+1)*64,192))
 if style.startswith('stripped_'):
  panel=int(style.rsplit('_',1)[1]);texture=stripped.crop((panel*64,0,(panel+1)*64,192))
 if style=='navy_lintel':
  for y in range(36):
   for x in range(64):
    if y<30+3*math.sin(x*.24):texture.putpixel((x,y),stripped.getpixel((x,y)))
 pix=texture.load()
 for y in range(192):
  for x in range(64):
   c=pix[x,y];grain=rng.choice([-3,-1,0,0,0,1,2]);pix[x,y]=tuple(max(0,min(255,v+grain)) for v in c)
 for axis,baseIndex in [('W',0),('N',1)]:
  for kind,offset,aperture in [('wall',0,None),('window',8,(.16,.3,.84,.70)),('door',10,(.06,.16,.94,1.01))]:
   im=Image.new('RGBA',(96,160));dest=im.load();sign=1 if axis=='N' else -1
   for y in range(160):
    for x in range(96):
     u=(x-48)/32*sign;v=(y-24-u*16)/96
     if not(0<=u<=1 and 0<=v<=1):continue
     if aperture and aperture[0]<u<aperture[2] and aperture[1]<v<aperture[3]:continue
     c=pix[min(63,round(u*63)),min(191,round(v*191))];shade=1 if axis=='N' else .88;dest[x,y]=(*[round(a*shade) for a in c],255)
   tile=f'tian_masonry_{style}_{baseIndex+offset}';i=len(sprites);sprites.append(im)
   regions[tile]=dict(page='original-masonry.png',x=i%8*96,y=i//8*160,w=96,h=160,ox=-16,oy=-24,scale=1)
   role={'wall':'Wall','window':'Window','door':'DoorWall'}[kind]
   props[tile]=dict(CustomName=label+('' if kind=='wall' else ' · '+kind+' opening'),GroupName='Tian',Facing=axis,TianVariantFamily='tian_masonry_'+style+'_'+kind,wall='',**({'TianDerivedAsset':'true'} if kind!='wall' else {}),**{role+axis:''})
# Open structural guards share wall anchors, but have no opaque infill. Append
# regions so existing masonry IDs and atlas coordinates remain stable.
for style,label in [('mesh','White fine-mesh guard'),('bars','White vertical-bar guard')]:
 for axis in ['N','W']:
  im=Image.new('RGBA',(96,160));draw=ImageDraw.Draw(im)
  sign=1 if axis=='N' else -1
  def at(u,h):return (round(48+sign*32*u),round(120+16*u-h))
  metal=(218,220,208,255) if axis=='N' else (185,194,183,255)
  mesh=(145,157,144,255) if axis=='N' else (124,139,128,255)
  height=36  # Approximately 1.1 m at the existing 96 px storey scale.
  if style=='mesh':
   # Thin orthogonal wire lattice: holes remain genuinely transparent.
   for i in range(1,16):draw.line([at(i/16,3),at(i/16,height-3)],fill=mesh,width=1)
   for h in range(5,height-2,4):draw.line([at(0,h),at(1,h)],fill=mesh,width=1)
  else:
   for i in range(1,8):draw.line([at(i/8,2),at(i/8,height-2)],fill=metal,width=1)
  for u in [0,1]:draw.line([at(u,0),at(u,height)],fill=metal,width=2)
  for h in [2,height]:draw.line([at(0,h),at(1,h)],fill=metal,width=2)
  tile=f'tian_guard_{style}_{axis}';i=len(sprites);sprites.append(im)
  regions[tile]=dict(page='original-masonry.png',x=i%8*96,y=i//8*160,w=96,h=160,ox=-16,oy=-24,scale=1)
  props[tile]=dict(CustomName=label,GroupName='Tian',Facing=axis,TianVariantFamily='tian_guard_'+style,
                  TianMaterial='painted steel',TianGuard='true',TianHeight='1.1',
                  **{'Wall'+axis:'','collide'+axis:'','Wall'+axis+'Trans':''})
sheet=Image.new('RGBA',(8*96,math.ceil(len(sprites)/8)*160))
for i,im in enumerate(sprites):sheet.paste(im,(i%8*96,i//8*160))
sheet.save(ROOT/'private-assets/original-masonry.png')
(ROOT/'src/masonry-assets.js').write_text('// Original procedural art; tools/make_masonry_assets.py\nconst data='+json.dumps(dict(regions=regions,properties=props),separators=(',',':'))+';\nexport function installMasonryAssets(properties,atlas){Object.assign(properties,data.properties);Object.assign(atlas.regions,data.regions);}\n')
print('Generated',len(sprites),'masonry faces')
