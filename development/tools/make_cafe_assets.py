"""Reusable original cafe furnishings; deterministic geometry, no copied pixels."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,math,random
ROOT=Path(__file__).resolve().parents[1]
regions={};properties={};sprites=[];device_turn=0
def rotate(p,n,size=3):
 x,y=p
 for _ in range(n):x,y=size-y,x
 return x,y
def clip(poly,x,y):
 for axis,bound,above in [(0,x,True),(0,x+1,False),(1,y,True),(1,y+1,False)]:
  out=[]
  for a,b in zip(poly,poly[1:]+poly[:1]):
   inside=lambda p:p[axis]>=bound-1e-9 if above else p[axis]<=bound+1e-9
   if inside(a):out.append(a)
   if inside(a)!=inside(b):
    t=(bound-a[axis])/(b[axis]-a[axis]);out.append(tuple(a[j]+t*(b[j]-a[j]) for j in range(2)))
  poly=out
 return poly
def oriented(p):
 x,y=p
 for _ in range(device_turn):x,y=1-y,x
 return x,y
def point(p,z=0):
 x,y=oriented(p);return round(48+(x-y)*32),round(120+(x+y)*16-z)
def polygon(poly,z,color):draw.polygon([point(p,z) for p in poly],fill=color)
def line(points,color,width=1):draw.line([point(p[:2],p[2]) for p in points],fill=color,width=width)
def begin():
 global im,draw
 im=Image.new('RGBA',(96,160));draw=ImageDraw.Draw(im)
def register(name,label,**props):
 index=len(sprites);sprites.append(im);regions[name]=dict(page='original-cafe.png',x=index%8*96,y=index//8*160,w=96,h=160,ox=-16,oy=-24,scale=1);properties[name]=dict(CustomName=label,GroupName='Tian',IsMoveAble='',**props)
def prism(poly,height,color):
 r,g,b=color
 for a,b in sorted(zip(poly,poly[1:]+poly[:1]),key=lambda e:sum(e[0])+sum(e[1])):
  dx,dy=b[0]-a[0],b[1]-a[1]
  if dy-dx<=1e-8:continue
  shade=.66+.17*max(0,dy)/max(1e-9,math.hypot(dx,dy));c=tuple(round(v*shade) for v in color)
  draw.polygon([point(a),point(b),point(b,height),point(a,height)],fill=c)
 polygon(poly,height,color)
def box(x,y,w,h,z,height,color):
 poly=[(x,y),(x+w,y),(x+w,y+h),(x,y+h)]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if oriented(b)[1]-oriented(a)[1]-(oriented(b)[0]-oriented(a)[0])>0:draw.polygon([point(a,z),point(b,z),point(b,z+height),point(a,z+height)],fill=tuple(round(v*.7) for v in color))
 polygon(poly,z+height,color)
# Five-cell L: straight serving edge, rounded outer corner and return.
for size,family,label in [(3,'tian_cafe_counter','Rounded service counter'),(2,'tian_cafe_compact_counter','Compact rounded service counter')]:
 outline=[(0,0),(size-1,0)]+[(size-1+math.cos(a),1+math.sin(a))for a in [-math.pi/2+i*math.pi/48 for i in range(1,25)]]+[(size,size),(size-1,size),(size-1,1),(0,1)]
 cells=[(x,0)for x in range(size)]+[(size-1,y)for y in range(1,size)]
 for turn,face in enumerate('NESW'):
  points=[rotate(p,turn,size) for p in outline]
  transformed=[]
  for x,y in cells:
   corners=[rotate(p,turn,size) for p in [(x,y),(x+1,y),(x+1,y+1),(x,y+1)]];transformed.append((round(min(p[0]for p in corners)),round(min(p[1]for p in corners))))
  for part,(x,y) in enumerate(transformed):
   begin();poly=[(a-x,b-y)for a,b in clip(points,x,y)]
   # Draw only exterior side faces; internal tile boundaries never grow a seam.
   for a,b in sorted(zip(points,points[1:]+points[:1]),key=lambda e:sum(e[0])+sum(e[1])):
    dx,dy=b[0]-a[0],b[1]-a[1]
    if dy-dx<=1e-8:continue
    lo,hi=0,1
    for dim,minimum in [(0,x),(1,y)]:
     delta=b[dim]-a[dim]
     if abs(delta)<1e-9:
      if a[dim]<minimum-1e-9 or a[dim]>minimum+1+1e-9:hi=-1
     else:
      near,far=sorted([(minimum-a[dim])/delta,(minimum+1-a[dim])/delta]);lo=max(lo,near);hi=min(hi,far)
    if hi<=lo:continue
    first=(a[0]+dx*lo-x,a[1]+dy*lo-y);last=(a[0]+dx*hi-x,a[1]+dy*hi-y)
    shade=.7+.18*max(0,dy)/math.hypot(dx,dy);color=tuple(round(v*shade) for v in (58,49,43))
    draw.polygon([point(first,2),point(last,2),point(last,33),point(first,33)],fill=color)
    # Vertical timber boards follow the perimeter, including the arc.
    count=max(1,round(math.hypot(last[0]-first[0],last[1]-first[1])*9))
    for i in range(count+1):
     u=first[0]+(last[0]-first[0])*i/count;v=first[1]+(last[1]-first[1])*i/count;line([(u,v,3),(u,v,32)],'#241f1c')
    line([(*first,2),(*last,2)],'#242321',2)
   polygon(poly,34,(57,55,50));polygon(poly,35,(71,68,61))
   # A fine bevel follows only the exterior outline; no artificial tile grid.
   for a,b in zip(poly,poly[1:]+poly[:1]):
    mid=((a[0]+b[0])/2+x,(a[1]+b[1])/2+y)
    if any(abs((v[0]-u[0])*(mid[1]-u[1])-(v[1]-u[1])*(mid[0]-u[0]))<1e-8 and min(u[0],v[0])-1e-8<=mid[0]<=max(u[0],v[0])+1e-8 and min(u[1],v[1])-1e-8<=mid[1]<=max(u[1],v[1])+1e-8 for u,v in zip(points,points[1:]+points[:1])):
     line([(*a,35),(*b,35)],'#726b5d')
   register(f'{family}_{face}_{part}',label,Facing=face,SpriteGridPos=f'{x},{y}',TianPrefabAnchor='true' if part==0 else 'false',TianVariantFamily=family,IsTable='',Surface='35',solidtrans='',container='counter',ContainerCapacity='50',TianDisplaySlots=json.dumps([[sum(p[0] for p in poly)/len(poly),sum(p[1] for p in poly)/len(poly),35]],separators=(',',':')),TianCollisionPolygon=json.dumps(poly,separators=(',',':')))
# Tabletop equipment models are decorative props with explicit support binding.
for turn,face in enumerate('NESW'):
 device_turn=turn
 begin();box(.12,.15,.76,.6,0,3,(82,84,80));box(.18,.2,.65,.48,3,16,(173,179,166));box(.19,.65,.63,.08,7,7,(36,40,37));box(.22,.69,.56,.13,2,2,(183,184,169))
 for x in [.32,.62]:line([(x,.67,12),(x,.83,12)],'#333a35',2);box(x-.04,.74,.11,.1,4,5,(232,222,193))
 for x in [.28,.45,.61]:box(x,.31,.1,.1,20,4,(226,219,196))
 register(f'tian_cafe_espresso_{face}_0','Espresso machine',Facing=face,TianVariantFamily='tian_cafe_espresso',TianMount='table',TianDecoration='equipment')
 begin();box(.27,.26,.46,.47,0,3,(70,70,62));box(.38,.38,.21,.23,3,13,(144,151,138));box(.3,.3,.39,.36,16,9,(43,48,43));box(.39,.35,.22,.25,25,15,(147,163,148));box(.35,.32,.3,.3,40,2,(53,60,52));line([(.53,.7,23),(.53,.77,12)],'#a3aaa0',2)
 register(f'tian_cafe_grinder_{face}_0','Coffee grinder',Facing=face,TianVariantFamily='tian_cafe_grinder',TianMount='table',TianDecoration='equipment')
# Reusable countertop details; both sets remain editable, supported decorations.
def vessel(x,y,levels,color):
 rings=[[(x+math.cos(i*math.pi/8)*r,y+math.sin(i*math.pi/8)*r,z) for i in range(16)] for z,r in levels]
 for lower,upper in zip(rings,rings[1:]):
  for i in range(16):
   j=(i+1)%16;a,b=lower[i],lower[j]
   if oriented(b[:2])[1]-oriented(a[:2])[1]-(oriented(b[:2])[0]-oriented(a[:2])[0])>0:
    shade=.66+.28*i/15;draw.polygon([point(a[:2],a[2]),point(b[:2],b[2]),point(upper[j][:2],upper[j][2]),point(upper[i][:2],upper[i][2])],fill=tuple(round(c*shade) for c in color))
 polygon([p[:2] for p in rings[-1]],levels[-1][0],color)
for turn,face in enumerate('NESW'):
 device_turn=turn
 begin();box(.08,.1,.8,.75,0,1,(54,56,50))
 vessel(.3,.38,[(1,.13),(4,.18),(12,.15),(15,.09)],(170,179,168));vessel(.3,.38,[(15,.095),(16,.07)],(73,81,73))
 line([(.15,.38,12),(.06,.4,17),(.11,.48,22)],'#bac4b6',2)
 line([(.43,.36,5),(.57,.39,6),(.58,.39,16),(.4,.38,16)],'#333a35',2)
 for x,y in [(.67,.3),(.65,.67)]:
  vessel(x,y,[(1,.1),(9,.085)],(172,194,182));vessel(x,y,[(9,.04),(16,.125)],(207,215,196))
  line([(x-.1,y,16),(x+.1,y,16)],'#e8e8d9')
 register(f'tian_cafe_brewkit_{face}_0','Pour-over kettle and drippers',Facing=face,TianVariantFamily='tian_cafe_brewkit',TianMount='table',TianDecoration='equipment')
 begin();box(.13,.15,.71,.58,0,1,(152,132,94))
 for x,y,h in [(.28,.33,15),(.47,.35,11),(.27,.62,8)]:
  vessel(x,y,[(1,.075),(h,.11)],(224,219,200))
  for z in range(3,h,3):line([(x-.07,y,z),(x+.07,y,z)],'#babdad')
 box(.61,.35,.12,.29,1,1,(54,58,50))
 for points,color in [([(.64,.4,2),(.8,.4,2),(.8,.46,19),(.64,.46,19)],'#363d36'),([(.65,.405,4),(.79,.405,4),(.79,.45,17),(.65,.45,17)],'#b7baa5')]:
  draw.polygon([point(p[:2],p[2]) for p in points],fill=color)
 for z in [7,10,13]:line([(.66,.44,z),(.77,.44,z)],'#585f52')
 register(f'tian_cafe_cups_{face}_0','Paper cups and menu stand',Facing=face,TianVariantFamily='tian_cafe_cups',TianMount='table',TianDecoration='equipment')
# Wall-mounted architectural details. Modular rails tile without end caps;
# an opening-compatible rail may cross a window pier, never a doorway.
for axis in ['N','W']:
 device_turn=0
 def wallbox(a,depth,width,z,height,color):
  if axis=='N':box(a,0,width,depth,z,height,color)
  else:box(0,a,depth,width,z,height,color)
 begin();wallbox(0,.18,1,12,2,(55,57,53))
 line([(0,0,14),(1,0,14)] if axis=='N' else [(0,0,14),(0,1,14)],'#767971')
 register(f'tian_cafe_sill_{axis}_0','Continuous sill rail',Facing=axis,TianVariantFamily='tian_cafe_sill',TianMount='wall',TianOpeningCompatible='window',TianDecoration='architectural',**{'attached'+axis:''})
 begin()
 # Slim steel uprights and three dark-stained timber shelves, no baked stock.
 for a in [.12,.82]:wallbox(a,.055,.035,19,61,(43,48,44))
 for z in [24,46,68]:
  wallbox(.045,.23,.91,z,2,(58,53,43))
  for a in [.12,.82]:
   points=[(a,0,z-7),(a,.2,z)] if axis=='N' else [(0,a,z-7),(.2,a,z)]
   line(points,'#333a35',2)
 register(f'tian_cafe_wall_shelves_{axis}_0','Three-tier wall display shelves',Facing=axis,TianVariantFamily='tian_cafe_wall_shelves',TianMount='wall',container='shelves',ContainerCapacity='15',TianDisplaySlots=json.dumps([([a,.13,z] if axis=='N' else [.13,a,z]) for z in [70,48,26] for a in [.3,.7]],separators=(',',':')),**{'attached'+axis:''})
# A plain service leaf and its open state; structural surrounds remain separate.
for axis,index in [('W',0),('N',1)]:
 device_turn=0
 def wallpoint(u,depth,z):return (u,depth,z) if axis=='N' else (depth,u,z)
 for opened in [False,True]:
  begin()
  def leafpoint(u,z):return wallpoint(.06,u-.06,z) if opened else wallpoint(u,0,z)
  poly=[leafpoint(.06,0),leafpoint(.94,0),leafpoint(.94,80),leafpoint(.06,80)]
  draw.polygon([point(p[:2],p[2]) for p in poly],fill='#303333' if axis=='N' else '#292e2e')
  line(poly+[poly[0]],'#1e2423')
  # Narrow brushed traces and a silver lever; no invented raised door panels.
  for j in range(60):
   u=.1+((j*17)%79)/100;z=4+(j*29)%69;line([leafpoint(u,z),leafpoint(u,min(77,z+2+j%5))],'#333636' if axis=='N' else '#2c3030')
  line([leafpoint(.73,38),leafpoint(.87,38)],'#b7bdb7',2)
  for z in [15,63]:line([leafpoint(.07,z),leafpoint(.07,z+5)],'#999f98',2)
  register(f'tian_cafe_service_door_{index+(2 if opened else 0)}','Dark service door',Facing=axis,TianVariantFamily='tian_cafe_service_door',**({'TianDerivedAsset':'true'} if opened else {'door'+axis:''}),**{'attached'+axis:''})
# An opaque fabric wall covering, distinct from a window curtain or an exit.
for axis in ['N','W']:
 device_turn=0;begin()
 def fp(u,depth,z):return (u,depth,z) if axis=='N' else (depth,u,z)
 for j in range(48):
  u=j/48;v=(j+1)/48;depth=.07+.05*math.sin(u*math.pi*12);tone=round(43+13*math.sin(u*math.pi*12))
  poly=[fp(u,depth,0),fp(v,depth,0),fp(v,depth,91),fp(u,depth,91)]
  draw.polygon([point(p[:2],p[2]) for p in poly],fill=(tone,tone+3,tone+5))
 line([fp(0,.06,92),fp(1,.06,92)],'#252b29',2)
 register(f'tian_cafe_wall_curtain_{axis}_0','Full-height charcoal wall curtain',Facing=axis,TianVariantFamily='tian_cafe_wall_curtain',TianMount='wall',TianDecoration='architectural',**{'attached'+axis:''})
# Reusable high-level surface conduit: two aligned pipes, no hidden wiring claim.
for axis in ['N','W']:
 for shape in ['straight','riser']:
  device_turn=0;begin()
  def cp(u,z):return (u,0,z) if axis=='N' else (0,u,z)
  for z in [92,95]:
   line([cp(0,z-1),cp(1,z-1)],'#777d76',2)
   line([cp(0,z),cp(1,z)],'#d4d8cc',2)
   for u in [.15,.85]:line([cp(u,z-1),cp(u,z+1)],'#9da596',1)
  if shape=='riser':
   line([cp(.72,95),cp(.68,96),cp(.67,99),cp(.67,103)],'#7d857b',3)
   line([cp(.72,96),cp(.69,97),cp(.69,99),cp(.69,103)],'#d4d8cc',2)
  register(f'tian_cafe_conduit_{shape}_{axis}_0','Twin surface conduit'+(' · riser' if shape=='riser' else ''),Facing=axis,TianVariantFamily='tian_cafe_conduit_'+shape,TianMount='wall',TianOpeningCompatible='lintel',TianDecoration='architectural',TianMaterial='painted metal',**{'attached'+axis:''})
# Ceiling-mounted fixtures: anchor at one storey, shade/pot clear of head height.
device_turn=0;begin()
x,y=point((.5,.5),96)
draw.ellipse((x-3,y-1,x+3,y+2),fill='#333731')
line([(.5,.5,96),(.5,.5,83)],'#34362f',1)
x,y=point((.5,.5),78)
draw.polygon([(x-3,y-7),(x+3,y-7),(x+10,y+4),(x-10,y+4)],fill='#383c33')
draw.line([(x-3,y-6),(x-8,y+3)],fill='#4d5044',width=1)
draw.ellipse((x-10,y+1,x+10,y+7),fill='#c7b992')
draw.ellipse((x-5,y+2,x+5,y+5),fill='#fff0c2')
register('tian_cafe_pendant_0','Charcoal cone pendant',TianMount='ceiling',TianLight='true',TianLightHeight='75',TianMaterial='painted metal',TianVariantFamily='tian_cafe_pendant')
begin()
line([(.5,.5,96),(.34,.34,74)],'#85735a',1);line([(.5,.5,96),(.67,.6,74)],'#85735a',1)
box(.34,.34,.32,.32,65,10,(136,79,48))
for i in range(14):
 angle=i*2.4;u=.5+math.cos(angle)*.3;v=.5+math.sin(angle)*.26;z=76+(i%3)
 line([(.5,.5,74),(u,v,z)],'#52603b',1)
 x,y=point((u,v),z);draw.ellipse((x-4,y-2,x+4,y+2),fill=['#47633a','#63773e','#7a8548'][i%3])
for side in [-1,1]:
 points=[(.5+side*(.2+.05*math.sin(i)),.55,74-i*3)for i in range(6)]
 line(points,'#667746',1)
 for u,v,z in points[1:]:
  x,y=point((u,v),z);draw.polygon([(x,y),(x+side*5,y+1),(x+side*3,y+5),(x,y+3)],fill='#58763d')
register('tian_cafe_hanging_plant_0','Trailing hanging planter',TianMount='ceiling',TianMaterial='terracotta and foliage',TianVariantFamily='tian_cafe_hanging_plant')
# Adjustable-family wall cone lamp; bracket projects away from its wall.
for axis in ['N','W']:
 device_turn=0;begin()
 def sp(u,v,z):return (u,v,z) if axis=='N' else (v,u,z)
 line([sp(.5,.02,80),sp(.5,.02,72)],'#3d4239',3)
 line([sp(.5,.02,79),sp(.5,.34,79),sp(.5,.4,75)],'#343b32',2)
 x,y=point(sp(.5,.4,0)[:2],72)
 draw.polygon([(x-2,y-5),(x+2,y-5),(x+8,y+3),(x-8,y+3)],fill='#343b32')
 draw.ellipse((x-8,y+1,x+8,y+5),fill='#f2dbac')
 register(f'tian_cafe_wall_cone_{axis}_0','Bracket cone wall lamp',Facing=axis,TianVariantFamily='tian_cafe_wall_cone',TianMount='wall',TianLight='true',TianLightHeight='70',TianMaterial='painted metal',**{'attached'+axis:''})
# Ceiling conduit modules share half-cell endpoints for clean grid joins.
for shape in ['straight','elbow','tee']:
 for turn,axis in enumerate('NESW'):
  if shape=='straight' and axis in ['S','W']:continue
  device_turn=turn;begin()
  paths={'straight':[[(0,.5),(1,.5)]],'elbow':[[(0,.5),(.5,.5),(.5,1)]],'tee':[[(0,.5),(1,.5)],[(.5,.5),(.5,1)]]}[shape]
  for path in paths:
   line([(u,v,94)for u,v in path],'#737d72',3)
   line([(u,v,95)for u,v in path],'#d6dacd',2)
  for u,v in [(p[0][0]*.7+.15,p[0][1]*.7+.15) for p in paths]:
   x,y=point((u,v),95);draw.line([(x-1,y),(x+1,y+1)],fill='#9ba58e',width=1)
  register(f'tian_cafe_ceiling_conduit_{shape}_{axis}_0','Ceiling conduit · '+shape,Facing=axis,TianVariantFamily='tian_cafe_ceiling_conduit_'+shape,TianMount='ceiling',TianDecoration='architectural',TianMaterial='painted metal')
# Independent straight preparation modules; reusable table support and storage.
for turn,face in enumerate('NESW'):
 device_turn=turn;begin()
 box(.02,.03,.96,.94,2,31,(202,200,187))
 box(0,0,1,1,33,2,(64,62,56))
 line([(0,1,35),(1,1,35)],'#969385')
 line([(.5,.99,4),(.5,.99,30)],'#898a7f')
 line([(.13,.995,27),(.36,.995,27)],'#575b55',2)
 line([(.64,.995,27),(.87,.995,27)],'#575b55',2)
 register(f'tian_cafe_prep_counter_{face}_0','Straight preparation counter',Facing=face,TianVariantFamily='tian_cafe_prep_counter',IsTable='',Surface='35',solidtrans='',container='counter',ContainerCapacity='50',TianMaterial='painted cabinetry and dark worktop')
# Preparation sink replaces a worktop module; basin is not a table support.
for turn,face in enumerate('NESW'):
 device_turn=turn;begin()
 box(.02,.03,.96,.94,2,31,(202,200,187))
 box(0,0,1,1,33,2,(64,62,56))
 line([(.5,.99,4),(.5,.99,30)],'#898a7f')
 for x in [.13,.64]:line([(x,.995,27),(x+.23,.995,27)],'#575b55',2)
 polygon([(.13,.19),(.87,.19),(.87,.83),(.13,.83)],35,'#c0c8c5')
 polygon([(.2,.26),(.8,.26),(.8,.76),(.2,.76)],35,'#4d6162')
 polygon([(.25,.34),(.72,.34),(.72,.7),(.25,.7)],35,'#829593')
 polygon([(.47,.47),(.54,.47),(.54,.54),(.47,.54)],35,'#344b4c')
 line([(.51,.14,35),(.51,.14,45),(.51,.24,48),(.51,.4,48),(.51,.4,44)],'#b8c7c4',3)
 line([(.51,.14,36),(.66,.14,36),(.66,.14,39)],'#d6ded5',2)
 register(f'tian_cafe_prep_sink_{face}_0','Preparation sink cabinet',Facing=face,TianVariantFamily='tian_cafe_prep_sink',solidtrans='',waterPiped='',TianMaterial='painted cabinetry and stainless steel')
# Return stair tread profiles: same cell order and transforms as return-stair-path.js.
for run in [2,3]:
 for handedness in ['left','right']:
  for turn,axis in enumerate('WNES'):
   profile=[(i,0,(run-i)/(2*run),(run-i+1)/(2*run),-1)for i in range(run,0,-1)]+[(0,0,.5,.5,0),(0,1,.5,.5,0)]+[(i,1,.5+(i-1)/(2*run),.5+i/(2*run),1)for i in range(1,run+1)]
   for index,(cx,cy,lo,hi,gx) in enumerate(profile):
    device_turn=0;begin();gy=0
    for _ in range(turn):gx,gy=-gy,gx
    # Draw stepped solids back-to-front, retaining the exact half-level landing.
    count=3 if hi>lo else 1
    pieces=[]
    for step in range(count):
     start,end=step/count,(step+1)/count
     if gx>0:rect=(start,0,end-start,1)
     elif gx<0:rect=(1-end,0,end-start,1)
     elif gy>0:rect=(0,start,1,end-start)
     elif gy<0:rect=(0,1-end,1,end-start)
     else:rect=(0,0,1,1)
     pieces.append((rect,96*(lo+(hi-lo)*end)))
    for (u,v,w,h),height in sorted(pieces,key=lambda p:p[0][0]+p[0][1]):
     box(u,v,w,h,0,height,(154,157,146))
     line([(u,v+h,height),(u+w,v+h,height)],'#c4c7b9')
     line([(u+w,v,height),(u+w,v+h,height)],'#747a6f')
    # Rails follow blocked side boundaries, leaving both route ports and the
    # shared half-height turning platform open. Transform with the same handedness.
    def guard_point(u,v):
     if handedness=='left':v=1-v
     for _ in range(turn):u,v=1-v,u
     height=96*(lo+(hi-lo)*(.5+gx*(u-.5)+gy*(v-.5)))
     return (u,v,height)
    edges=[((0,0),(1,0)),((0,1),(1,1))] if cx else [((0,0),(0,1)),((0,cy),(1,cy))]
    guards=[]
    for a,b in edges:
     a,b=guard_point(*a),guard_point(*b);guards.append({'a':a,'b':b,'height':28})
     for t in [0,.5,1]:
      u,v,h=[a[j]+(b[j]-a[j])*t for j in range(3)]
      line([(u,v,h),(u,v,h+28)],'#414943',2)
     line([(a[0],a[1],a[2]+28),(b[0],b[1],b[2]+28)],'#a2a998',2)
     line([(a[0],a[1],a[2]+14),(b[0],b[1],b[2]+14)],'#59655b')
    register(f'tian_return_stair_{run}_{handedness}_{axis}_{index}',f'Return staircase {run} · {handedness}',Facing=axis,TianVariantFamily=f'tian_return_stair_{run}_{handedness}',TianDerivedAsset='true',TianReturnStair='',TianMaterial='concrete and painted steel',TianStairGuards=json.dumps(guards,separators=(',',':')),solidfloor='',TianStairLow=str(lo),TianStairHigh=str(hi),TianStairGradient=f'{gx},{gy}',TianStairPart=str(index))
device_turn=0
# Street furniture and suspended entrance canopy, reusable outside the cafe case.
device_turn=0;begin()
# Tapered molded shell with open side handles, not a table on four straight legs.
# Build each perforated face from strips so holes remain genuinely transparent.
def stool_face(a,b,color):
 def surface(u,v):
  # Bottom spreads to .16/.84; seat narrows to .25/.75.
  x=a[0]+(b[0]-a[0])*u;y=a[1]+(b[1]-a[1])*u
  factor=1-v*(1-.5/.68)
  return point((.5+(x-.5)*factor,.5+(y-.5)*factor),v*19)
 outer=[surface(0,0),surface(1,0),surface(1,1),surface(0,1)]
 inner=[surface(.25,.27),surface(.75,.27),surface(.75,.72),surface(.25,.72)]
 for i in range(4):
  j=(i+1)%4;draw.polygon([outer[i],outer[j],inner[j],inner[i]],fill=color)
 draw.line([inner[0],inner[3],inner[2]],fill='#abb7b8',width=1)
stool_face((.84,.16),(.84,.84),'#dce3e4')
stool_face((.84,.84),(.16,.84),'#c3cecf')
box(.24,.24,.52,.52,19,2,(238,244,244))
register('tian_street_stool_0','White plastic stool',Facing='N',TianMaterial='white plastic',BedType='badBed',solidtrans='')
for turn,axis in enumerate(['N','W']):
 device_turn=turn;begin();box(.12,.3,.76,.36,0,12,(174,177,166))
 # Three horizontal cores open on the long vertical faces; the top is solid.
 # Draw only the visible face after rotating, so W does not inherit N shading.
 for y in [.3,.66]:
  a,b=((.12,y),(.88,y)) if y==.3 else ((.88,y),(.12,y))
  oa,ob=oriented(a),oriented(b)
  if ob[1]-oa[1]-(ob[0]-oa[0])<=0:continue
  for x in [.22,.44,.66]:
   # Rounded arch mouth and shallow inner reveal convey the core depth.
   mouth=[(x,y,2),(x+.12,y,2),(x+.12,y,8)]+[(x+.06+.06*math.cos(t),y,8+2*math.sin(t)) for t in [i*math.pi/8 for i in range(1,9)]]
   draw.polygon([point(v[:2],v[2])for v in mouth],fill='#505950')
   line([(x,y,2),(x,y,8),(x+.025,y,9)],'#798276')
   line([(x+.01,y,2),(x+.115,y,2)],'#bac0ac')
 register(f'tian_street_block_{axis}_0','Hollow concrete block',Facing=axis,TianVariantFamily='tian_street_block',TianMaterial='concrete',solid='')
for face,axis,side in [('N','N',-1),('W','W',-1),('S','N',1),('E','W',1)]:
 device_turn=0;begin()
 # Canopy projects outward from the N/W attachment plane; no floor collision.
 def cp(u,v,z):return (u,-v*side,z) if axis=='N' else (-v*side,u,z)
 poly=[cp(0,-.6,85),cp(1,-.6,85),cp(1,.02,88),cp(0,.02,88)]
 draw.polygon([point(p[:2],p[2])for p in poly],fill='#b8bdb6')
 for u in [.05,.32,.65,.95]:line([cp(u,-.6,85),cp(u,.02,88)],'#6c756e')
 fascia=[cp(0,-.6,85),cp(1,-.6,85),cp(1,-.6,76),cp(0,-.6,76)]
 draw.polygon([point(p[:2],p[2])for p in fascia],fill='#8c9690');line(fascia+[fascia[0]],'#48534e')
 for u in [.12,.86]:line([cp(u,0,72),cp(u,-.55,84)],'#4a554e',2)
 register(f'tian_street_canopy_{face}_0','Metal entrance canopy',Facing=face,TianVariantFamily='tian_street_canopy',TianMaterial='sheet metal',TianMount='wall',TianOpeningCompatible='lintel',TianDecoration='architectural',**{'attached'+axis:''})
# Wide entry canopy: two panels share a fascia and remain one editable fixture.
for face,axis,side in [('N','N',-1),('W','W',-1),('S','N',1),('E','W',1)]:
 for part in range(2):
  device_turn=0;begin()
  def cp(u,v,z):return (u,-v*side,z) if axis=='N' else (-v*side,u,z)
  poly=[cp(0,-.6,85),cp(1,-.6,85),cp(1,.02,88),cp(0,.02,88)]
  draw.polygon([point(p[:2],p[2])for p in poly],fill='#b8bdb6')
  for u in [.05,.32,.65,.95]:line([cp(u,-.6,85),cp(u,.02,88)],'#6c756e')
  fascia=[cp(0,-.6,85),cp(1,-.6,85),cp(1,-.6,76),cp(0,-.6,76)]
  draw.polygon([point(p[:2],p[2])for p in fascia],fill='#8c9690')
  line([fascia[0],fascia[1]],'#48534e');line([fascia[3],fascia[2]],'#48534e')
  edge=0 if part==0 else 1;line([cp(edge,-.6,76),cp(edge,-.6,85)],'#48534e')
  u=.12 if part==0 else .86;line([cp(u,0,72),cp(u,-.55,84)],'#4a554e',2)
  register(f'tian_street_wide_canopy_{face}_{part}','Wide metal entrance canopy',Facing=face,SpriteGridPos=f'{part if axis=="N" else 0},{part if axis=="W" else 0}',TianVariantFamily='tian_street_wide_canopy',TianMaterial='sheet metal',TianMount='wall',TianOpeningCompatible='lintel',TianDecoration='architectural',**{'attached'+axis:''})
device_turn=0
# Running-bond pavement: repeatable clipped brick geometry, not photo pixels.
for style,base in [('grey',(145,145,132)),('rose',(151,130,119))]:
 device_turn=0;begin();polygon([(0,0),(1,0),(1,1),(0,1)],0,'#696d61')
 for row in range(8):
  for column in range(-1,5):
   x=column*.25+(row%2)*.125;y=row*.125
   poly=clip([(x+.008,y+.008),(x+.242,y+.008),(x+.242,y+.117),(x+.008,y+.117)],0,0)
   if len(poly)>2:
    delta=((row*13+column*7)%17)-8;polygon(poly,0,tuple(max(0,min(255,c+delta))for c in base))
 register(f'tian_street_pavers_{style}_0',f'{style.title()} running-bond paving',solidfloor='',TianMaterial='paving brick',TianVariantFamily=f'tian_street_pavers_{style}')
 # Height variants reuse the exact top-surface region. Runtime derives exposed
 # risers from neighboring terrain; do not bake seams into every cell sprite.
 for height in [2,4,6,8,12,16]:
  source=f'tian_street_pavers_{style}_0';name=f'tian_street_platform_{style}_{height}_0'
  regions[name]=dict(regions[source])
  properties[name]={**properties[source],'CustomName':f'{style.title()} raised paving · {height} px','TianGroundHeight':str(height),'TianVariantFamily':f'tian_street_platform_{style}_{height}'}

# Surface-mounted utility pipe sections. Decorative, with no simulated fuel network.
for axis in ['N','W']:
 for shape in ['straight','riser','elbow','meter']:
  device_turn=0;begin()
  def cp(u,z):return (u,0,z) if axis=='N' else (0,u,z)
  paths=[]
  if shape in ['straight','elbow']:paths.append([cp(0,18),cp(1,18)])
  if shape=='riser':paths.append([cp(.8,0),cp(.8,96)])
  if shape=='elbow':paths.append([cp(.8,0),cp(.8,18)])
  if shape=='meter':paths.extend([[cp(.8,25),cp(.8,63),cp(.4,63),cp(.4,61)],[cp(.4,42),cp(.4,40),cp(.8,40)]])
  for path in paths:
   line(path,'#613831',3);line(path,'#96524a',1)
  if shape=='straight':
   for u in [.22,.78]:line([cp(u,15),cp(u,21)],'#6e746d',1)
  if shape=='elbow':
   # This retained asset is a tee branch, with three connected ports.
   line([cp(.73,18),cp(.87,18)],'#b26957',3)
  if shape in ['riser','elbow']:

   for z in ([12,58,90] if shape=='riser' else [10]):line([cp(.75,z),cp(.85,z)],'#7b8175',2)
  if shape=='meter':
   box(.18 if axis=='N' else .015,.015 if axis=='N' else .18,.32 if axis=='N' else .13,.13 if axis=='N' else .32,42,19,(155,166,161))
   line([cp(.29,57),cp(.44,57)],'#384a43',2)
   line([cp(.77,30),cp(.85,30)],'#d4b95c',2)
  ports=[cp(0,18),cp(1,18)] if shape=='straight' else [cp(.8,0),cp(.8,96)] if shape=='riser' else [cp(0,18),cp(1,18),cp(.8,0)] if shape=='elbow' else [cp(.8,63),cp(.8,40)]
  register(f'tian_street_pipe_{shape}_{axis}_0',f'Red utility pipe · {"tee branch" if shape=="elbow" else shape}',TianPipePorts=json.dumps(ports,separators=(',',':')),Facing=axis,**({'TianOpeningCompatible':'window'} if shape=='straight' else {}),TianVariantFamily=f'tian_street_pipe_{shape}',TianMaterial='painted metal',TianMount='wall',TianDecoration='architectural',**{'attached'+axis:''})
# Explicit diagonal art preserves the physical plane and remains a supported fixture.
for axis in ['D-','D+']:
 device_turn=0;begin()
 path=[(0,1,18),(1,0,18)] if axis=='D-' else [(0,0,18),(1,1,18)]
 line(path,'#613831',3);line(path,'#96524a',1)
 for u in [.22,.78]:
  x,y=(u,1-u) if axis=='D-' else (u,u)
  line([(x,y,15),(x,y,21)],'#6e746d',1)
 register(f'tian_street_pipe_straight_{"DM" if axis=="D-" else "DP"}_0','Red utility pipe · diagonal '+axis,Facing=axis,TianWallAxis=axis,TianPipePorts=json.dumps(path,separators=(',',':')),TianVariantFamily='tian_street_pipe_straight',TianMaterial='painted metal',TianMount='wall',TianDecoration='architectural')
# Reusable painted wall graphics. Plane-specific art uses the same host binding as pipes.
for axis,suffix in [('N','N'),('W','W'),('D-','DM'),('D+','DP')]:
 for graphic in ['door_symbol','stripe']:
  device_turn=0;begin()
  def wp(u,h):return (u,0,h) if axis=='N' else (0,u,h) if axis=='W' else (u,1-u,h) if axis=='D-' else (u,u,h)
  line([wp(0,48),wp(1,48)],'#deded2',1)
  if graphic=='door_symbol':
   for outline in [[(.18,48),(.18,76),(.5,72),(.5,52),(.18,48)],[(.5,52),(.5,72),(.82,76),(.82,48),(.5,52)]]:
    line([wp(u,h) for u,h in outline],'#e6e5db',2)
   for u in [.24,.76]:
    pt=point(wp(u,60)[:2],60);draw.ellipse((pt[0]-1,pt[1]-1,pt[0]+1,pt[1]+1),fill='#e6e5db')
  mount={'TianWallAxis':axis} if axis.startswith('D') else {'attached'+axis:''}
  register(f'tian_wall_{graphic}_{suffix}_0','Open-door wall symbol' if graphic=='door_symbol' else 'White facade stripe',Facing=axis,TianVariantFamily='tian_wall_'+graphic,TianMaterial='paint',TianMount='wall',TianDecoration='architectural',**mount)
# Reusable street surfaces. Appended to preserve all earlier atlas coordinates.
device_turn=0;begin();polygon([(0,0),(1,0),(1,1),(0,1)],0,'#636a63')
# Interlocking concrete blocks: a repeatable dog-bone outline in four rows.
for row in range(4):
 for col in range(-1,5):
  x=col*.25+(row%2)*.125;y=row*.25
  outline=[(0,.02),(.075,.02),(.09,.05),(.16,.05),(.175,.02),(.25,.02),(.25,.23),(.175,.23),(.16,.20),(.09,.20),(.075,.23),(0,.23)]
  poly=clip([(x+a,y+b) for a,b in outline],0,0)
  if len(poly)>2:
   delta=(row*11+col*7)%15-7
   polygon(poly,0,tuple(v+delta for v in (126,134,122)))
register('tian_street_interlocking_0','Interlocking concrete road paving',solidfloor='',TianMaterial='concrete pavers',TianVariantFamily='tian_street_interlocking')
for turn,face in enumerate('NW'):
 device_turn=turn;begin()
 polygon([(.12,.22),(.88,.22),(.88,.78),(.12,.78)],0,'#7d8279')
 polygon([(.17,.27),(.83,.27),(.83,.73),(.17,.73)],0,'#282e2d')
 for j in range(9):
  x=.20+j*.07;line([(x,.29,0),(x,.71,0)],'#7a837c',1)
 line([(.18,.49,0),(.82,.49,0)],'#5b655e',1)
 for x in [.145,.855]:
  for y in [.245,.755]:
   a,b=point((x,y));draw.point((a,b),fill='#333d37')
 register(f'tian_street_drain_{face}_0','Storm drain grate',solidfloor='',FloorOverlay='',Facing=face,TianMaterial='cast iron',TianVariantFamily='tian_street_drain',TianMount='floor',TianDecoration='street drainage')
# Shaped ground reuses the exact existing texture region. Geometry is shared by
# rendering, actor support and editor validation; the lower road remains editable.
for style in ['rose','grey']:
 for turn,face in enumerate('NESW'):
  source=f'tian_street_platform_{style}_6_0'
  name=f'tian_street_chamfer_{style}_{face}_0'
  regions[name]=dict(regions[source])
  shape=[rotate(p,turn,1) for p in [(0,0),(1,0),(0,1)]]
  properties[name]={**properties[source],'CustomName':f'{style.title()} chamfered paving · 6 px','Facing':face,'TianVariantFamily':f'tian_street_chamfer_{style}','TianGroundPolygon':json.dumps(shape,separators=(',',':')),'TianGroundBase':'tian_street_interlocking_0'}
# Reusable reverse-counter details: surface menu, narrow display cabinet and spots.
for turn,face in enumerate('NESW'):
 device_turn=turn;begin()
 box(.14,.76,.72,.23,0,2,(143,127,99))
 polygon([(.19,.79),(.81,.79),(.81,.96),(.19,.96)],2,'#dad8c8')
 # Small marks suggest a printed menu without claiming readable source wording.
 for j in range(4):
  v=.81+j*.045;line([(.27,v,2.2),(.55 if j else .65,v,2.2)],'#646961',1)
  if j:line([(.66,v,2.2),(.74,v,2.2)],'#757b70',1)
 register(f'tian_cafe_framed_menu_{face}_0','Framed tabletop menu',Facing=face,TianVariantFamily='tian_cafe_framed_menu',TianMount='table',TianDecoration='menu',TianMaterial='wood and paper')
 begin()
 box(.04,.05,.43,.90,0,50,(42,43,41));box(.02,.03,.47,.94,50,2,(57,59,55))
 for j in range(19):
  y=.08+j*.046;line([(.475,y,3),(.475,y,49)],(42+j%3*3,44+j%3*3,42+j%3*3))
 line([(.48,.50,5),(.48,.50,47)],'#262c28')
 line([(.49,.44,42),(.49,.48,42)],'#94988a',1)
 register(f'tian_cafe_display_cabinet_{face}_0','Narrow charcoal display cabinet',Facing=face,TianVariantFamily='tian_cafe_display_cabinet',IsTable='',Surface='52',solidtrans='',container='counter',ContainerCapacity='35',TianCollisionPolygon=json.dumps([rotate(p,turn,1) for p in [(.02,.03),(.49,.03),(.49,.97),(.02,.97)]],separators=(',',':')),TianMaterial='dark stained wood')
 begin()
 box(.40,.40,.20,.20,93,3,(192,195,180))
 line([(.50,.50,94),(.57,.56,88)],'#484f49',3)
 # Tilted cylindrical spot and warm lens, distinct from a pendant.
 line([(.57,.56,88),(.78,.70,82)],'#303734',7)
 u,v=point((.78,.70),82);draw.ellipse((u-3,v-2,u+3,v+2),fill='#ecd9a4',outline='#73786b')
 register(f'tian_cafe_ceiling_spot_{face}_0','Adjustable ceiling spotlight',Facing=face,TianVariantFamily='tian_cafe_ceiling_spot',TianMount='ceiling',TianLight='true',TianLightHeight='82',TianMaterial='painted metal')
# Back faces of ordinary wall shelves; no scene-specific positions.
for face,axis in [('E','W'),('S','N')]:
 device_turn=0;begin()
 def wb(a,depth,width,z,height,color):
  if axis=='N':box(a,-depth,width,depth,z,height,color)
  else:box(-depth,a,depth,width,z,height,color)
 for a in [.12,.82]:wb(a,.055,.035,19,61,(43,48,44))
 for z in [24,46,68]:
  wb(.045,.23,.91,z,2,(58,53,43))
  for a in [.12,.82]:line([(a,0,z-7),(a,-.2,z)] if axis=='N' else [(0,a,z-7),(-.2,a,z)],'#333a35',2)
 register(f'tian_cafe_wall_shelves_{face}_0','Three-tier wall display shelves',Facing=face,TianVariantFamily='tian_cafe_wall_shelves',TianMount='wall',TianWallSide='opposite',container='shelves',ContainerCapacity='15',TianDisplaySlots=json.dumps([([a,-.13,z] if axis=='N' else [-.13,a,z]) for z in [70,48,26] for a in [.3,.7]],separators=(',',':')),**{'attached'+axis:''})
# Paired circular tabletop display: physical form observed, function unspecified.
# Left-half cabinet footprint; rotate the pair with its support in all four views.
for turn,face in enumerate('NESW'):
 device_turn=turn;begin()
 for cy in [.28,.72]:
  box(.16,cy-.08,.22,.16,0,1,(55,58,54))
  line([(.25,cy,1),(.22,cy,7)],'#777c73',2)
  rim=[(.25-.055*math.sin(a),cy+.165*math.cos(a),10+8*math.sin(a)) for a in [i*math.tau/40 for i in range(40)]]
  draw.polygon([point(p[:2],p[2]) for p in rim],fill='#a3a99f')
  disc=[(.255-.052*math.sin(a),cy+.151*math.cos(a),10+7.4*math.sin(a)) for a in [i*math.tau/40 for i in range(40)]]
  draw.polygon([point(p[:2],p[2]) for p in disc],fill='#e0e1d9')
 register(f'tian_cafe_round_display_pair_{face}_0','Round tabletop display pair',Facing=face,TianVariantFamily='tian_cafe_round_display_pair',TianMount='table',TianDecoration='display',TianMaterial='pale circular face and dark stand')
# Reusable deterministic surface study: palettes vary, grain density stays at
# world scale. Explicit family per material keeps colors independently searchable.
for style,base,chips,joint in [
 ('grey',(128,132,125),[(183,186,173),(158,161,149),(93,99,92)],'#6a7168'),
 ('ivory',(177,175,155),[(220,216,197),(197,186,160),(137,143,128)],'#979782'),
 ('charcoal',(52,59,55),[(84,91,81),(65,74,67),(39,46,43)],'#282f2c')]:
 device_turn=0;begin();polygon([(0,0),(1,0),(1,1),(0,1)],0,base)
 # Independent axes avoid diagonal bands when cells repeat. Local fixed seed.
 grain=random.Random('tian-terrazzo-grain-v1')
 for i in range(170):
  u=grain.random();v=grain.random()
  a,b=point((u,v));color=chips[i%len(chips)]
  draw.point((a,b),fill=color)
  if i%4==0:draw.point((a+1,b),fill=color)
 line([(0,0,0),(1,0,0),(1,1,0)],joint,1)
 register(f'tian_material_terrazzo_{style}_0',f'{style.title()} terrazzo tile',solidfloor='',TianMaterial='terrazzo',TianVariantFamily=f'tian_material_terrazzo_{style}')
# Interior finish batch: thin floor borders and wall-mounted utility details.
for turn,face in enumerate('NESW'):
 device_turn=turn;begin()
 polygon([(0,0),(1,0),(1,.42),(0,.42)],0,'#373d39')
 for j in range(5):
  y=.05+j*.075;line([(0,y,0),(.35,y+.02,0),(.68,y-.02,0),(1,y+.01,0)],'#484e47',1)
 line([(0,.42,0),(1,.42,0)],'#242d27',1)
 register(f'tian_material_stone_border_{face}_0','Dark stone floor border',Facing=face,TianVariantFamily='tian_material_stone_border',FloorOverlay='',TianMount='floor',TianMaterial='dark stone')
for face,turn,axis in [('N',0,'N'),('W',3,'W')]:
 device_turn=turn;begin()
 box(.05,.02,.90,.20,70,13,(196,199,183))
 box(.09,.215,.82,.035,71,3,(117,126,114))
 for z in [71,72,73]:line([(.12,.251,z),(.88,.251,z)],'#7a8478',1)
 line([(.72,.255,80),(.82,.255,80)],'#a1b3a0',1)
 register(f'tian_wall_cooling_unit_{face}_0','Wall cooling unit',Facing=face,TianVariantFamily='tian_wall_cooling_unit',TianMount='wall',TianDecoration='equipment',TianMaterial='pale casing',**{'attached'+axis:''})
 for height,kind,label in [(12,'low','Low wall outlet'),(43,'worktop','Worktop wall outlet')]:
  begin();box(.39,.015,.22,.035,height,7,(194,194,180))
  for u in [.46,.54]:
   line([(u,.055,height+2),(u,.055,height+4)],'#58635b',1)
  register(f'tian_wall_outlet_{kind}_{face}_0',label,Facing=face,TianVariantFamily=f'tian_wall_outlet_{kind}',TianMount='wall',TianDecoration='electrical fitting',TianMaterial='pale wall plate',**{'attached'+axis:''})
# Multi-wall graphics: one centered symbol, independently supported sprite parts.
# Width variants are separate families, not mistaken for orientation variants.
for span in [2,3]:
 for axis,suffix in [('N','N'),('W','W'),('D-','DM'),('D+','DP')]:
  for part in range(span):
   device_turn=0;begin()
   def wp(u,h):
    v=u-part
    return (v,0,h) if axis=='N' else (0,v,h) if axis=='W' else (v,1-v,h) if axis=='D-' else (v,v,h)
   def segment(a,b):
    du=b[0]-a[0];lo,hi=0.,1.
    if abs(du)<1e-9:
     if not part<=a[0]<=part+1:return
    else:
     t0,t1=sorted([(part-a[0])/du,(part+1-a[0])/du]);lo=max(lo,t0);hi=min(hi,t1)
     if lo>hi:return
    line([wp(a[0]+du*t,a[1]+(b[1]-a[1])*t) for t in [lo,hi]],'#e6e5db',2)
   center=span/2
   outlines=[[(center-.48,48),(center-.48,76),(center,72),(center,52),(center-.48,48)],[(center,52),(center,72),(center+.48,76),(center+.48,48),(center,52)]]
   segment((0,48),(span,48))
   for outline in outlines:
    for a,b in zip(outline,outline[1:]):segment(a,b)
   for u in [center-.36,center+.36]:
    if part<=u<part+1:
     pt=point(wp(u,60)[:2],60);draw.ellipse((pt[0]-1,pt[1]-1,pt[0]+1,pt[1]+1),fill='#e6e5db')
   gx,gy=(part,0) if axis=='N' else (0,part) if axis=='W' else (part,span-1-part) if axis=='D-' else (part,part)
   mount={'TianWallAxis':axis} if axis.startswith('D') else {'attached'+axis:''}
   register(f'tian_wall_symbol_{span}_{suffix}_{part}',f'Open-door wall graphic · {span} panels',Facing=axis,SpriteGridPos=f'{gx},{gy}',TianPrefabAnchor='true' if part==0 else 'false',TianVariantFamily=f'tian_wall_symbol_{span}',TianMaterial='paint',TianMount='wall',TianDecoration='architectural',**mount)
device_turn=0
# Straight flights: the same normalized rise/gradient contract as routed stairs.
# Keep all previous atlas coordinates stable by appending complete new families.
for run in [3,4,5,6]:
 for axis,(gx,gy) in {'N':(0,-1),'W':(-1,0),'E':(1,0),'S':(0,1)}.items():
  for index in range(run):
   device_turn=0;begin();lo=index/run;hi=(index+1)/run;pieces=[]
   for step in range(3):
    start,end=step/3,(step+1)/3
    rect=(start,0,end-start,1) if gx>0 else (1-end,0,end-start,1) if gx<0 else (0,start,1,end-start) if gy>0 else (0,1-end,1,end-start)
    pieces.append((rect,96*(lo+(hi-lo)*end)))
   for (u,v,w,h),height in sorted(pieces,key=lambda p:p[0][0]+p[0][1]):
    box(u,v,w,h,0,height,(218,213,195))
    line([(u,v+h,height),(u+w,v+h,height)],'#eeeadd')
   guards=[]
   for side in [0,1]:
    ends=[(0,side),(1,side)] if gx else [(side,0),(side,1)]
    points=[(u,v,96*(lo+(hi-lo)*(.5+gx*(u-.5)+gy*(v-.5)))) for u,v in ends]
    guards.append({'a':points[0],'b':points[1],'height':32})
    for t in [0,.25,.5,.75,1]:
     u,v,h=[points[0][j]+(points[1][j]-points[0][j])*t for j in range(3)]
     line([(u,v,h),(u,v,h+32)],'#e0e4d7')
    line([(points[0][0],points[0][1],points[0][2]+32),(points[1][0],points[1][1],points[1][2]+32)],'#f0eee2',2)
   register(f'tian_straight_stair_{run}_{axis}_{index}',f'White straight staircase · {run} cells',Facing=axis,TianVariantFamily=f'tian_straight_stair_{run}',TianDerivedAsset='true',TianReturnStair='',TianStairShape='straight',TianMaterial='concrete and painted steel',TianStairGuards=json.dumps(guards,separators=(',',':')),solidfloor='',TianStairLow=str(lo),TianStairHigh=str(hi),TianStairGradient=f'{gx},{gy}',TianStairPart=str(index))
device_turn=0
sheet=Image.new('RGBA',(8*96,math.ceil(len(sprites)/8)*160))
for i,s in enumerate(sprites):sheet.paste(s,(i%8*96,i//8*160))
sheet.save(ROOT/'private-assets/original-cafe.png')
(ROOT/'src/cafe-assets.js').write_text('// Original procedural art; tools/make_cafe_assets.py\nconst data='+json.dumps(dict(regions=regions,properties=properties),separators=(',',':'))+';\nexport function installCafeAssets(properties,atlas){Object.assign(properties,data.properties);Object.assign(atlas.regions,data.regions);}\n')
print('Generated',len(sprites),'cafe sprite parts')
