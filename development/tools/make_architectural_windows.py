"""Original parametric steel sash windows. No reference-photo pixels used."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
ROOT=Path(__file__).resolve().parents[1]
regions={}; properties={}; sprites=[]
profile=[.12,.08,.88,.86]
for axis in ['N','W']:
 for state in range(4):
  im=Image.new('RGBA',(96,160)); d=ImageDraw.Draw(im)
  def pt(u,v):
   # v is measured downward from the wall top.
   return (round(48+(u if axis=='N' else -u)*32),round(24+u*16+v*96))
  def rect(l,t,r,b,color):d.polygon([pt(l,t),pt(r,t),pt(r,b),pt(l,b)],fill=color)
  l,t,r,b=profile; mid=(t+b)/2
  # Slight tint, with a clear view through the glass field.
  if state==0:rect(l,t,r,b,(117,146,141,45))
  elif state==1:rect(l,t,r,mid,(117,146,141,60))
  elif state==2:
   for pts in [[(l,t),(l+.16,t),(l+.04,t+.12)],[(r,t),(r-.12,t),(r,t+.1)],[(l,b),(l+.1,b),(l,b-.1)]]:
    d.polygon([pt(*p) for p in pts],fill=(137,170,163,135))
  # Outer frame stays fixed; upper/lower sash meet on the central rail.
  for a,c in [((l,t),(r,t)),((r,t),(r,b)),((r,b),(l,b)),((l,b),(l,t))]:d.line([pt(*a),pt(*c)],fill='#343d3a',width=2)
  rail=mid if state!=1 else t+.06
  d.line([pt(l,rail),pt(r,rail)],fill='#3e4841',width=2)
  if state==1:d.line([pt(l,mid),pt(r,mid)],fill='#434c45',width=1)
  if state==0:
   d.line([pt(l+.07,t+.035),pt(l+.07,mid-.03)],fill=(183,202,184,110),width=1)
   d.line([pt(l+.07,mid+.04),pt(l+.07,b-.035)],fill=(183,202,184,95),width=1)
  x,y=pt((l+r)/2,rail);d.line([(x-1,y),(x+2,y+1)],fill='#9a9d86',width=1)
  name=f'tian_tall_steel_window_{axis}_{state}';index=len(sprites);sprites.append(im)
  regions[name]=dict(page='original-architecture.png',x=index*96,y=0,w=96,h=160,ox=-16,oy=-24,scale=1)
  if state==0:properties[name]=dict(CustomName='Tall steel sash window',GroupName='Tian',Facing=axis,IsMoveAble='',MoveType='Window',TianVariantFamily='tian_tall_steel_window',TianWindowProfile=json.dumps(profile,separators=(',',':')),OpenTileOffset='1',SmashedTileOffset='2',GlassRemovedOffset='3',**{'window'+axis:''})
# Reusable white two-light window. Existing steel sprite IDs/coordinates stay fixed.
for axis in ['N','W']:
 for state in range(4):
  im=Image.new('RGBA',(96,160));d=ImageDraw.Draw(im)
  profile=[.08,.16,.92,.78]
  def pt(u,v):return (round(48+(u if axis=='N' else -u)*32),round(24+u*16+v*96))
  def rect(l,t,r,b,color):d.polygon([pt(l,t),pt(r,t),pt(r,b),pt(l,b)],fill=color)
  l,t,r,b=profile;mid=(t+b)/2
  if state==0:rect(l,t,r,b,(112,150,160,55))
  elif state==1:rect(l,t,(l+r)/2,b,(112,150,160,55))
  elif state==2:
   for tri in [[(l,t),(l+.2,t),(l,t+.13)],[(r,b),(r-.14,b),(r,b-.14)]]:d.polygon([pt(*p) for p in tri],fill=(160,186,192,130))
  for a,c in [((l,t),(r,t)),((r,t),(r,b)),((r,b),(l,b)),((l,b),(l,t))]:
   d.line([pt(*a),pt(*c)],fill='#afb4ae',width=3)
   d.line([pt(*a),pt(*c)],fill='#e6e7db',width=1)
  d.line([pt(.5,t),pt(.5,b)],fill='#d5d9cf',width=2)
  if state==1:d.line([pt(.5,t),pt(.68,t+.05),pt(.68,b-.05),pt(.5,b)],fill='#d5d9cf',width=1)
  if state==0:d.line([pt(l+.08,t+.025),pt(l+.08,b-.025)],fill=(220,231,229,135),width=1)
  name=f'tian_white_sash_window_{axis}_{state}';index=len(sprites);sprites.append(im)
  regions[name]=dict(page='original-architecture.png',x=index*96,y=0,w=96,h=160,ox=-16,oy=-24,scale=1)
  if state==0:properties[name]=dict(CustomName='White two-light window',GroupName='Tian',Facing=axis,IsMoveAble='',MoveType='Window',TianVariantFamily='tian_white_sash_window',TianMaterial='painted frame and glass',TianWindowProfile=json.dumps(profile,separators=(',',':')),OpenTileOffset='1',SmashedTileOffset='2',GlassRemovedOffset='3',**{'window'+axis:''})
# Removable renovation sheeting: a hosted covering, never a replacement wall/window.
for axis in ['N','W']:
 im=Image.new('RGBA',(96,160));d=ImageDraw.Draw(im)
 def pt(u,v):return (round(48+(u if axis=='N' else -u)*32),round(24+u*16+v*96))
 d.polygon([pt(.08,.07),pt(.93,.08),pt(.91,.9),pt(.09,.91)],fill=(146,165,184,232))
 for a,b,c in [((.08,.07),(.48,.26),(.91,.44)),((.93,.08),(.47,.48),(.09,.76)),((.08,.47),(.61,.58),(.91,.9)),((.09,.91),(.33,.56),(.46,.09))]:
  d.line([pt(*a),pt(*b),pt(*c)],fill=(206,214,218,220),width=1)
 for u in [.08,.92]:
  for v in [.08,.33,.62,.89]:
   x,y=pt(u,v);d.rectangle([x-1,y-1,x+1,y+2],fill='#b9ab87')
 name=f'tian_window_protection_{axis}_0';index=len(sprites);sprites.append(im)
 regions[name]=dict(page='original-architecture.png',x=index*96,y=0,w=96,h=160,ox=-16,oy=-24,scale=1)
 properties[name]=dict(CustomName='Renovation window sheeting',GroupName='Tian',Facing=axis,IsMoveAble='',TianVariantFamily='tian_window_protection',TianMaterial='plastic sheeting and tape',TianMount='window',TianDecoration='architectural',**{'attached'+axis:''})
for axis in ['N','W']:
 for part in range(2):
  im=Image.new('RGBA',(96,160));d=ImageDraw.Draw(im)
  def pt(u,v):return (round(48+(u if axis=='N' else -u)*32),round(24+u*16+v*96))
  d.polygon([pt(.08 if part==0 else 0,.07),pt(1 if part==0 else .93,.08),pt(1 if part==0 else .91,.9),pt(.09 if part==0 else 0,.91)],fill=(146,165,184,232))
  for a,b,c in [((.08,.07),(.48,.26),(.91,.44)),((.93,.08),(.47,.48),(.09,.76)),((.08,.47),(.61,.58),(.91,.9)),((.09,.91),(.33,.56),(.46,.09))]:
   d.line([pt(*a),pt(*b),pt(*c)],fill=(206,214,218,220),width=1)
  for u in [.08,.92]:
   for v in [.08,.33,.62,.89]:
    x,y=pt(u,v);d.rectangle([x-1,y-1,x+1,y+2],fill='#b9ab87')
  name=f'tian_wide_window_protection_{axis}_{part}';index=len(sprites);sprites.append(im)
  regions[name]=dict(page='original-architecture.png',x=index*96,y=0,w=96,h=160,ox=-16,oy=-24,scale=1)
  properties[name]=dict(CustomName='Wide renovation window sheeting',SpriteGridPos=f'{part if axis=="N" else 0},{part if axis=="W" else 0}',GroupName='Tian',Facing=axis,IsMoveAble='',TianVariantFamily='tian_wide_window_protection',TianMaterial='plastic sheeting and tape',TianMount='window',TianDecoration='architectural',**{'attached'+axis:''})
# Two-cell operable assemblies. Inner profile edges meet exactly: no masonry pier.
for axis in ['N','W']:
 for part in range(2):
  for state in range(4):
   im=Image.new('RGBA',(96,160));d=ImageDraw.Draw(im)
   def pt(u,v):return (round(48+(u if axis=='N' else -u)*32),round(24+u*16+v*96))
   def rect(l,t,r,b,color):d.polygon([pt(l,t),pt(r,t),pt(r,b),pt(l,b)],fill=color)
   l,t,r,b=[.08 if part==0 else 0,.08,1 if part==0 else .92,.86];profile=[l,t,r,b];mid=(t+b)/2
   if state==0:rect(l,t,r,b,(117,146,141,45))
   elif state==1:rect(l,t,r,mid,(117,146,141,60))
   elif state==2:d.polygon([pt(l,t),pt(l+.15,t),pt(l,t+.12)],fill=(137,170,163,135))
   for a,c in [((l,t),(r,t)),((l,b),(r,b))]:d.line([pt(*a),pt(*c)],fill='#343d3a',width=2)
   outer=l if part==0 else r
   d.line([pt(outer,t),pt(outer,b)],fill='#343d3a',width=2)
   # A slim central mullion belongs to the second panel, independent sash states.
   if part==1:d.line([pt(0,t),pt(0,b)],fill='#3e4841',width=1)
   rail=t+.06 if state==1 else mid;d.line([pt(l,rail),pt(r,rail)],fill='#3e4841',width=2)
   name=f'tian_wide_steel_window_{axis}_{part*4+state}';index=len(sprites);sprites.append(im)
   regions[name]=dict(page='original-architecture.png',x=index*96,y=0,w=96,h=160,ox=-16,oy=-24,scale=1)
   if state==0:properties[name]=dict(CustomName='Wide steel sash window',GroupName='Tian',Facing=axis,IsMoveAble='',MoveType='Window',TianVariantFamily='tian_wide_steel_window',TianWindowAssembly='continuous',TianMaterial='painted steel and glass',SpriteGridPos=f'{part if axis=="N" else 0},{part if axis=="W" else 0}',TianWindowProfile=json.dumps(profile,separators=(',',':')),OpenTileOffset='1',SmashedTileOffset='2',GlassRemovedOffset='3',**{'window'+axis:''})
# Two independent leaves, one continuous opening. Open pose is runtime geometry.
for axis in ['N','W']:
 for part in range(2):
  im=Image.new('RGBA',(96,160));d=ImageDraw.Draw(im)
  def pt(u,v):return (round(48+(u if axis=='N' else -u)*32),round(24+u*16+v*96))
  l,t,r,b=[.06 if part==0 else 0,.14,1 if part==0 else .94,1]
  d.polygon([pt(l,t),pt(r,t),pt(r,b),pt(l,b)],fill=(117,148,143,48))
  for a,c in [((l,t),(r,t)),((l,b),(r,b)),((l,t),(l,b)),((r,t),(r,b))]:
   d.line([pt(*a),pt(*c)],fill='#5e6761',width=3)
   d.line([pt(*a),pt(*c)],fill='#bcc0ad',width=1)
  for v in [.48,.72]:d.line([pt(l,v),pt(r,v)],fill='#90998c',width=1)
  for u in [l+(r-l)*.32,l+(r-l)*.68]:d.line([pt(u,t),pt(u,b)],fill='#858f82',width=1)
  handle=r-.13 if part==0 else l+.13
  d.line([pt(handle,.46),pt(handle,.68)],fill='#b19b5d',width=2)
  d.line([pt(l+.14,t+.03),pt(l+.14,.42)],fill=(199,217,204,100),width=1)
  name=f'tian_double_steel_door_{axis}_{part}';index=len(sprites);sprites.append(im)
  regions[name]=dict(page='original-architecture.png',x=index*96,y=0,w=96,h=160,ox=-16,oy=-24,scale=1)
  properties[name]=dict(CustomName='Double steel glazed door',GroupName='Tian',Facing=axis,IsMoveAble='',TianVariantFamily='tian_double_steel_door',TianDoorAssembly='continuous',TianDoorHinge='start' if part==0 else 'end',TianDoorProfile=json.dumps([l,t,r,b],separators=(',',':')),TianMaterial='steel and glass',SpriteGridPos=f'{part if axis=="N" else 0},{part if axis=="W" else 0}',doorTrans='',**{'door'+axis:''})
sheet=Image.new('RGBA',(96*len(sprites),160))
for i,im in enumerate(sprites):sheet.paste(im,(96*i,0))
sheet.save(ROOT/'private-assets/original-architecture.png')
(ROOT/'src/architectural-assets.js').write_text('// Original procedural art; tools/make_architectural_windows.py\nconst data='+json.dumps(dict(regions=regions,properties=properties),separators=(',',':'))+';\nexport function installArchitecturalAssets(properties,atlas){Object.assign(properties,data.properties);Object.assign(atlas.regions,data.regions);}\n')
print('Generated',len(sprites),'window states')
