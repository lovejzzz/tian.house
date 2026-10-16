"""Original, code-drawn isometric furnishings (Pillow). No copied source pixels."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, math
ROOT=Path(__file__).resolve().parents[1]
sprites=[]; regions={}; properties={}
def pt(u,v,z=0): return (round(48+(u-v)*32),round(120+(u+v)*16-z))
def poly(points,color): d.polygon([pt(*p) for p in points],fill=color)
def box(u,v,w,h,z,height,color):
    r,g,b=color
    poly([(u,v+h,z),(u+w,v+h,z),(u+w,v+h,z+height),(u,v+h,z+height)],(int(r*.7),int(g*.7),int(b*.7)))
    poly([(u+w,v,z),(u+w,v+h,z),(u+w,v+h,z+height),(u+w,v,z+height)],(int(r*.86),int(g*.86),int(b*.86)))
    poly([(u,v,z+height),(u+w,v,z+height),(u+w,v+h,z+height),(u,v+h,z+height)],color)
def line(points,color,width=1): d.line([pt(*p) for p in points],fill=color,width=width)
def ellipse(u,v,z,rx,ry,color):
    x,y=pt(u,v,z); d.ellipse((x-rx,y-ry,x+rx,y+ry),fill=color)
def begin():
    global im,d
    im=Image.new('RGBA',(96,160));d=ImageDraw.Draw(im)
def end(name,label,**p):
    index=len(sprites);sprites.append(im.copy());regions[name]=dict(page='original-house-details.png',x=(index%8)*96,y=(index//8)*160,w=96,h=160,ox=-16,oy=-24,scale=1)
    properties[name]=dict(CustomName=label,GroupName='Tian',IsMoveAble='',**p)
def plane(axis,a,z): return (a,0,z) if axis=='N' else (0,a,z)
def wallrect(axis,a,b,z,h,color): poly([plane(axis,a,z),plane(axis,b,z),plane(axis,b,z+h),plane(axis,a,z+h)],color)

# Small props rest at zero; renderer snaps them to the actual support surface.
for kind,label in [('tea','Tea tray & ceramics'),('books','Books & reading glasses'),('kitchen','Chopping board & produce'),('desk','Notebook & coffee'),('wash','Folded towels & soap'),('radio','Emergency radio & logbook')]:
    begin()
    if kind=='tea':
        box(.12,.2,.65,.5,0,2,(119,83,51));ellipse(.46,.42,7,6,4,(220,213,185));ellipse(.46,.42,11,4,2,(243,233,202));line([(.54,.43,8),(.74,.43,10)],'#ded6b9',3)
        for u in [.25,.68]: ellipse(u,.61,5,3,2,(226,218,196));ellipse(u,.61,6,2,1,(78,62,44))
    elif kind in ['books','desk','radio']:
        box(.17,.2,.45,.35,0,3,(73,102,86));box(.19,.2,.41,.32,3,2,(215,205,171));box(.2,.22,.4,.28,5,2,(157,89,61))
        if kind=='radio':
            box(.55,.42,.36,.3,0,14,(67,79,68));line([(.62,.5,14),(.62,.5,33)],'#aeb4a6');box(.60,.7,.16,.02,4,5,(146,168,115))
        elif kind=='desk': ellipse(.74,.62,5,4,3,(219,219,195));ellipse(.74,.62,7,3,2,(76,55,41));line([(.3,.7,2),(.66,.72,2)],'#e1c17c')
        else: line([(.55,.61,3),(.73,.58,3),(.85,.65,3)],'#b8a16e',2)
    elif kind=='kitchen':
        box(.12,.12,.75,.65,0,2,(180,142,88));ellipse(.52,.38,6,8,4,(210,199,169))
        for u,v,c in [(.46,.37,'#cd7849'),(.6,.4,'#799157'),(.5,.5,'#deb461')]:ellipse(u,v,9,3,3,c)
        line([(.26,.45,3),(.26,.8,3)],'#bcc3ba',2)
    else:
        box(.15,.15,.53,.42,0,5,(228,222,199));box(.17,.17,.49,.38,5,4,(170,184,163));box(.72,.45,.13,.13,0,6,(206,215,192));line([(.78,.51,6),(.78,.51,10)],'#aeb7ae',2)
    end('tian_detail_'+kind,label,TianMount='table')

begin();ellipse(.5,.5,1,8,4,'#675741');line([(.5,.5,1),(.5,.5,22)],'#a88d5d',2)
poly([(.15,.35,15),(.8,.35,15),(.7,.35,32),(.3,.35,32)],'#d9ccb0');ellipse(.48,.35,32,6,3,'#ede2c1');ellipse(.48,.35,15,11,4,'#f6dfad')
end('tian_detail_lamp','Linen table lamp',TianMount='table',TianLight='warm',LightRadius='4')
begin();ellipse(.5,.5,1,10,5,'#534d40');line([(.5,.5,1),(.5,.5,72)],'#9b8051',2);poly([(.16,.34,58),(.85,.34,58),(.7,.34,77),(.3,.34,77)],'#d2c5a7');ellipse(.5,.34,58,11,4,'#e9d0a0');ellipse(.5,.34,77,6,3,'#e7dabc')
end('tian_floor_lamp','Brass reading lamp',TianLight='warm',LightRadius='5',BlocksPlacement='')

for axis in ['N','W']:
    attach={'attached'+axis:'','TianMount':'wall','Facing':axis}
    begin()
    for a,b in [(.01,.35),(.65,.99)]:
        wallrect(axis,a,b,5,89,'#c6b898')
        for i in range(8):wallrect(axis,a+i*.04,a+i*.04+.024,5,89,['#e2d6b9','#b6a78d'][i%2])
    wallrect(axis,0,1,84,10,'#d0c2a4')
    for a in [.05,.2,.4,.6,.8,.95]:wallrect(axis,a,a+.035,84,10,'#baad91')
    line([plane(axis,0,96),plane(axis,1,96)],'#a38b62',2)
    end('tian_curtain_'+axis,'Linen window drapes',**{**attach,'TianMount':'window'})
    for style,label in [('botanical','Botanical study'),('abstract','Terracotta composition'),('notice','Shelter planning board')]:
        begin();wallrect(axis,.12,.89,38,35,'#6b5039');wallrect(axis,.17,.84,42,27,'#e5dcc3')
        if style=='botanical':
            line([plane(axis,.5,44),plane(axis,.5,65)],'#596d47',2)
            for a,z in [(.32,49),(.65,54),(.33,60)]:line([plane(axis,.5,z-4),plane(axis,a,z)],'#688057',3)
        elif style=='abstract':wallrect(axis,.22,.44,46,18,'#a56547');wallrect(axis,.47,.78,43,12,'#717e60');wallrect(axis,.50,.7,59,7,'#ceb07c')
        else:
            for z in [47,53,59,65]:line([plane(axis,.25,z),plane(axis,.72,z)],'#728675',1)
            wallrect(axis,.68,.78,45,4,'#b58254')
        end('tian_art_'+style+'_'+axis,label,**attach,**({'TianBrief':'shelter'} if style=='notice' else {}))
    for kind,label in [('sconce','Brass wall light'),('strip','Utility wall light'),('vent','Ventilation grille')]:
        begin()
        if kind=='sconce':
            wallrect(axis,.36,.66,48,20,'#8e7958');wallrect(axis,.4,.62,52,14,'#ffe6b4')
        elif kind=='strip':wallrect(axis,.05,.95,76,8,'#777d71');wallrect(axis,.08,.92,78,4,'#e9efd3')
        else:
            wallrect(axis,.1,.9,70,16,'#abb4a8')
            for z in range(73,84,3):line([plane(axis,.15,z),plane(axis,.85,z)],'#596b65')
        end('tian_wall_'+kind+'_'+axis,label,**attach,**({'TianLight':'warm','LightRadius':'5'} if kind!='vent' else {}))

begin();box(.03,.05,.9,.9,0,6,(91,98,87));box(.06,.08,.85,.85,6,52,(176,201,191))
for u in [.08,.3,.54,.79,.9]:line([(u,.94,8),(u,.94,57)],'#7b8981',1)
for z in [17,34,51]:line([(.06,.94,z),(.91,.94,z)],'#78887f',1);line([(.91,.08,z),(.91,.94,z)],'#78887f',1)
ellipse(.52,.49,60,7,3,'#565f51');box(.35,.935,.35,.012,22,14,(227,224,200));x,y=pt(.4,.95,29);d.text((x-1,y-4),'H2O',fill='#4c6868');line([(.55,.96,9),(.55,1.06,9)],'#577c7c',3)
end('tian_water_tank','Water reserve · 1000 L',solidtrans='',waterAmount='1000',waterMaxAmount='1000',TianUtility='water')
begin();box(.15,.18,.65,.64,0,65,(111,126,119));box(.22,.83,.48,.01,22,33,(72,88,80));box(.3,.85,.22,.01,46,6,(172,191,137));line([(.5,.2,65),(.5,.2,100),(.5,0,104)],'#949f94',6)
for z in range(27,42,4):line([(.27,.84,z),(.62,.84,z)],'#293f38',1)
end('tian_air_unit','Filtered air handling unit',solidtrans='',TianUtility='air')
begin();box(.08,.1,.8,.74,0,50,(78,92,83))
for z in [4,20,36]:box(.14,.85,.62,.01,z,12,(113,127,106));line([(.23,.87,z+6),(.53,.87,z+6)],'#424f46',2)
box(.55,.86,.12,.01,42,4,(162,197,131))
end('tian_power_bank','Battery & inverter cabinet',solidtrans='',TianUtility='power')
for month in range(1,13):
    begin();box(.05,.07,.88,.8,0,54,(127,103,72))
    for z in [3,20,37]:
        box(.09,.88,.79,.01,z,14,(166,143,103));line([(.18,.9,z+7),(.65,.9,z+7)],'#846d4d',1)
    box(.24,.90,.46,.01,39,10,(222,213,178));x,y=pt(.28,.92,45);d.text((x-1,y-4),f'{month:02d}',fill='#3e503e')
    for u in [.2,.45,.7]:box(u,.2,.13,.18,54,7,(194,183,143))
    end(f'tian_ration_{month}',f'Month {month:02d} · Dry-food cabinet',solidtrans='',container='crate',ContainerCapacity='80',TianUtility='food')

# Fixed architectural glazing: slim powder-coated frames, no opaque knee wall.
# Glass is translucent; the room and garden remain visible through its full height.
for axis in ['N','W']:
    for width in [1,2]:
        for part in range(width):
            begin()
            wallrect(axis,0,1,2,91,(157,195,188,32))
            wallrect(axis,0,1,0,2,'#262d2b');wallrect(axis,0,1,94,2,'#242b29')
            if part==0:wallrect(axis,0,.045,0,96,'#28312f')
            if part==width-1:wallrect(axis,.955,1,0,96,'#202825')
            line([plane(axis,0,93),plane(axis,1,93)],'#697971')
            # restrained reflected sky streaks, not an opaque blue shop window
            line([plane(axis,.2,18),plane(axis,.38,74)],(223,239,220,45))
            name=f'tian_glazing_{axis}_{width}_{part}'
            prop={'Facing':axis,'Window'+axis:'','collide'+axis:'','wall':'','MaterialType':'Glass','TianGlazing':'fixed'}
            if width==2:prop['SpriteGridPos']=f'{part if axis=="N" else 0},{part if axis=="W" else 0}'
            end(name,('Picture glazing' if width==2 else 'Slim-frame glazing'),**prop)

# Two-tile drapes flank a picture window rather than hiding its center.
for axis in ['N','W']:
    for part in range(2):
        begin();a,b=(.02,.32) if part==0 else (.68,.98)
        wallrect(axis,a,b,3,90,'#c9c5b5')
        for i in range(7):wallrect(axis,a+i*.043,a+i*.043+.022,3,90,['#e0dbca','#a6aa9f'][i%2])
        line([plane(axis,0,95),plane(axis,1,95)],'#555e57',1)
        end(f'tian_picture_drape_{axis}_{part}','Picture-window linen drapes',**{'attached'+axis:'','TianMount':'window','Facing':axis,'SpriteGridPos':f'{part if axis=="N" else 0},{part if axis=="W" else 0}'})

# Explicit wall faces append after legacy regions, preserving atlas coordinates.
for facing,axis,side in [('S','N','front'),('N','N','opposite'),('E','W','front'),('W','W','opposite')]:
    begin()
    wallrect(axis,.35,.65,56,16,'#46504b');wallrect(axis,.39,.61,59,10,'#ffe6b4')
    end('tian_directional_sconce_'+facing,'Directional wall light',**{'attached'+axis:'','TianMount':'wall','Facing':facing,'TianWallSide':side,'TianVariantFamily':'directional-wall-light','TianLight':'warm','LightRadius':'5'})

# Bathroom family: append regions; existing saves retain all old coordinates.
for facing,axis,side in [('N','N','opposite'),('W','W','opposite'),('S','N','front'),('E','W','front')]:
    begin();wallrect(axis,.16,.84,43,27,'#69533f');wallrect(axis,.20,.80,46,22,'#a8b8ba')
    line([plane(axis,.23,48),plane(axis,.66,65)],'#d2dcda',2)
    wallrect(axis,.16,.84,42,2,'#8b7258')
    end('tian_bath_mirror_'+facing,'Bathroom mirror cabinet',**{'attached'+axis:'','TianMount':'wall','Facing':facing,'TianWallSide':side,'TianVariantFamily':'bath-mirror','container':'shelves','ContainerCapacity':'8','TianEmptyContainer':'true'})
    begin();line([plane(axis,.16,42),plane(axis,.84,42)],'#8d9694',3)
    wallrect(axis,.28,.72,23,19,'#d7cbb6');wallrect(axis,.31,.69,24,2,'#a9b5a9')
    end('tian_bath_towel_'+facing,'Wall towel rail',**{'attached'+axis:'','TianMount':'wall','Facing':facing,'TianWallSide':side,'TianVariantFamily':'bath-towel'})

sheet=Image.new('RGBA',(8*96,math.ceil(len(sprites)/8)*160))
for i,s in enumerate(sprites):sheet.paste(s,((i%8)*96,(i//8)*160))
sheet.save(ROOT/'private-assets/original-house-details.png')
data=json.dumps(dict(regions=regions,properties=properties),separators=(',',':'))
(ROOT/'src/house-detail-assets.js').write_text('// Original generated art; tools/make_house_details.py\nconst data='+data+";\nexport function installHouseDetails(properties,atlas){for(const [id,p]of Object.entries(data.properties))if(!p.TianVariantFamily&&['N','W'].includes(p.Facing))p.TianVariantFamily=id.replace(/_[NW](?=_|$)/,'_axis').replace(/_\\d+$/,'');Object.assign(properties,data.properties);Object.assign(atlas.regions,data.regions);}\n")
print(f'Created {len(sprites)} original furnishing sprites')
