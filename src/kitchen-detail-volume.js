import {roundedBox,lathe,rod,barHandle,knob,profileExtrude,roundedProfile,checkDetailPart} from './detail-geometry.js?v=a890ced93fdd';
// Kitchen appliances and base units built from real construction: carcass, fronts
// separated by reveals, hardware on standoffs, overhanging worktops with a rounded
// nosing, gaskets, grilles and turned controls. Dimensions follow ordinary
// European kitchen practice (design assumptions, not a specific product).
// Part IDs used by interaction code are preserved: fridge doors/seals/handles,
// fridge shelves and liners, counter/sink doors, sink fixture anchor at index 0.
const REVEAL=.003;
function shakerFront(parts,id,material,frameMaterial,x,y,z,W,H,{frame=.058,thickness=.02,depthRelief=.007}={}){
 // Back slab, then proud stiles and rails: the exposed panel reads recessed.
 parts.push(roundedBox(id,material,[x,y,z],[W,thickness-depthRelief,H],.002));
 const Y=y+thickness-depthRelief,r=.0025;
 parts.push(roundedBox(id+':stile:0',frameMaterial,[x,Y,z],[frame,depthRelief,H],r,{collision:false}));
 parts.push(roundedBox(id+':stile:1',frameMaterial,[x+W-frame,Y,z],[frame,depthRelief,H],r,{collision:false}));
 parts.push(roundedBox(id+':rail:0',frameMaterial,[x+frame,Y,z],[W-2*frame,depthRelief,frame],r,{collision:false}));
 parts.push(roundedBox(id+':rail:1',frameMaterial,[x+frame,Y,z+H-frame],[W-2*frame,depthRelief,frame],r,{collision:false}));
}
// Worktops stop at the unit depth so runs and the peninsula align exactly; the
// 15 mm nosing overhang comes from recessing the carcass and fronts instead.
const FRONT=.035,FRONT_T=.02;
function baseCarcass(parts,w,d,h,{worktop=true,hollow=false}={}){
 const front=d-FRONT;
 parts.push(roundedBox('kick','dark',[.025,.05,0],[w-.05,front-.07-.05,.11],.002));
 if(hollow){
  // Open cabinet under a basin: bottom, sides and back only.
  parts.push(roundedBox('cabinet-bottom','timber',[.018,.018,.11],[w-.036,front-.018,.018],.0015));
  for(const [i,x]of [0,w-.018].entries())parts.push(roundedBox(`cabinet-side:${i}`,'timber',[x,0,.11],[.018,front,h-.11-.04],.0015));
  parts.push(roundedBox('cabinet-back','timber',[.018,0,.11],[w-.036,.018,h-.11-.04],.0015));
 }else parts.push(roundedBox('carcass','timber',[0,0,.11],[w,front,h-.11-.04],.0015));
 if(worktop)parts.push(profileExtrude('worktop','stone',roundedProfile(0,d,h-.04,h,{ft:.008,fb:.003}),0,w));
}
export function fridgeDetail(recipe){
 const {width:w,depth:d,height:h}=recipe.parameters,parts=[],zf=h*.66,front=d-.045;
 // Plinth with a ventilation grille behind the doors.
 parts.push(roundedBox('plinth','dark',[.04,.06,0],[w-.08,front-.06-.025,.08],.004));
 for(let i=0;i<4;i++)parts.push(roundedBox('grille:'+i,'dark',[.07,front-.03,.014+i*.016],[w-.14,.012,.007],.003,{collision:false}));
 // Insulated shell with rounded outer verticals; open interior for contents.
 parts.push(roundedBox('back','enamel',[0,0,.08],[w,.065,h-.08],.012));
 parts.push(roundedBox('left-side','enamel',[0,.03,.08],[.045,front-.03-.01,h-.08],.012));
 parts.push(roundedBox('right-side','enamel',[w-.045,.03,.08],[.045,front-.03-.01,h-.08],.012));
 parts.push(roundedBox('top-liner','enamel',[.02,.03,h-.045],[w-.04,front-.04,.045],.01));
 parts.push(roundedBox('base-liner','liner',[.045,.065,.08],[w-.09,front-.075,.045],.004));
 parts.push(roundedBox('divider-liner','liner',[.045,.065,zf-.025],[w-.09,front-.075,.05],.006));
 // Glass shelves on the existing contents heights, white front trims.
 for(const [i,z]of [.34,.65,.96].entries())if(z<zf-.08){
  parts.push(roundedBox('shelf:'+i,'glass',[.05,.075,z],[w-.1,d-.29,.006],.002));
  parts.push(roundedBox('shelf-edge:'+i,'liner',[.05,d-.215,z-.008],[w-.1,.018,.022],.004));
 }
 // Two crisper drawers below the lowest shelf (inside the liner, under contents).
 for(let i=0;i<2;i++){const W=(w-.11)/2,x=.05+i*(W+.01);
  parts.push(roundedBox(`crisper:${i}`,'crisper',[x,.08,.13],[W,d-.31,.17],.008,{collision:false}));
  parts.push(roundedBox(`crisper-lip:${i}`,'liner',[x,d-.235,.27],[W,.02,.03],.006,{collision:false}));
 }
 parts.push(roundedBox('hinge-cap','steel',[w-.07,front-.01,h-.012],[.05,.05,.012],.004,{collision:false}));
 // Doors: rounded slab, gasket, inner bins that swing with the door, bar handle.
 for(const [id,z,H]of [['lower',.09,zf-.1],['freezer',zf+REVEAL,h-zf-REVEAL-.004]]){
  parts.push(roundedBox(id+'-seal','rubber',[.028,front-.012,z+.015],[w-.056,.014,H-.03],.006,{collision:false}));
  parts.push(roundedBox(id+'-door','enamel',[.006,front,z],[w-.012,.045,H],.014));
  const binLevels=id==='lower'?[.22,.5,.78].map(t=>z+H*t):[z+H*.35];
  for(const [k,bz]of binLevels.entries()){
   parts.push(roundedBox(`${id}-door:bin:${k}`,'liner',[.07,front-.12,bz],[w-.14,.12,.008],.003,{collision:false}));
   parts.push(roundedBox(`${id}-door:bin-lip:${k}`,'crisper',[.07,front-.12,bz],[w-.14,.01,.075],.004,{collision:false}));
  }
  parts.push(...barHandle(id+'-handle','steel',[.065,d,z+(id==='lower'?H-.06-Math.min(.34,H-.2):.06)],[0,0,1],[0,1,0],{length:Math.min(.34,H-.2),radius:.011,standoff:.035,postRadius:.008}));
 }
 return parts.map(checkDetailPart);
}
export function rangeDetail(recipe){
 const {width:w,depth:d,height:h}=recipe.parameters,parts=[],front=d-.06;
 parts.push(roundedBox('plinth','dark',[.05,.05,0],[w-.1,front-.09,.09],.003));
 parts.push(roundedBox('cabinet','enamel',[0,0,.09],[w,front,h-.09-.04],.006));
 // Steel hob with gas burners and two cast-iron grates spanning the burner pairs.
 parts.push(profileExtrude('cooktop','steel',roundedProfile(0,d,h-.04,h,{ft:.008,fb:.004}),0,w));
 const burners=[[.25,.32,.05],[.25,.68,.04],[.6,.32,.04],[.6,.68,.05]].map(([u,v,r])=>[u*w,v*d,r]);
 for(const [k,[x,y,r]]of burners.entries()){const i=k>>1,j=k&1;
  parts.push(lathe(`burner:${i}:${j}`,'cast-iron',[x,y],[[0,h],[r+.012,h],[r+.012,h+.006],[r,h+.016],[r*.72,h+.018],[0,h+.018]],{segments:28,collision:false}));
  parts.push(lathe(`burner-cap:${i}:${j}`,'dark',[x,y],[[0,h+.018],[r*.7,h+.018],[r*.68,h+.026],[r*.45,h+.031],[0,h+.032]],{segments:24,collision:false}));
 }
 const gz=h+.034,gr=.0055;
 for(const [g,x0,x1]of [[0,.03,w/2-.008],[1,w/2+.008,w-.03]]){
  const y0=.05,y1=d-.07;
  for(const [a,b]of [[[x0,y0,gz],[x1,y0,gz]],[[x1,y0,gz],[x1,y1,gz]],[[x1,y1,gz],[x0,y1,gz]],[[x0,y1,gz],[x0,y0,gz]]])parts.push(rod(`grate:${g}:frame:${parts.length}`,'cast-iron',a,b,gr,{segments:8,collision:false}));
  const cx=(x0+x1)/2;for(let f=0;f<3;f++){const y=y0+(y1-y0)*(f+1)/4;parts.push(rod(`grate:${g}:finger:${f}`,'cast-iron',[x0,y,gz],[x1,y,gz],gr*.9,{segments:8,collision:false}));}
  parts.push(rod(`grate:${g}:spine`,'cast-iron',[cx,y0,gz],[cx,y1,gz],gr*.9,{segments:8,collision:false}));
  for(const [fx,fy]of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]])parts.push(rod(`grate:${g}:foot:${fx.toFixed(3)}:${fy.toFixed(3)}`,'cast-iron',[fx,fy,h],[fx,fy,gz],gr,{segments:8,collision:false}));
 }
 // Control fascia: five turned knobs and a small black-glass clock window.
 parts.push(roundedBox('fascia','steel',[.01,front,h-.155],[w-.02,.012,.11],.004,{collision:false}));
 for(let i=0;i<5;i++){const x=.1+i*(w-.2)/4.4+(i>=3?.09:0);parts.push(knob(`control:${i}`,'dark',[x,front+.012,h-.1],{radius:.019,depth:.026}));}
 parts.push(roundedBox('clock','black-glass',[w*.52,front+.012,h-.118],[.09,.003,.036],.003,{collision:false}));
 // Oven door: framed black glass, full-width bar handle; storage drawer below.
 const dz=.165,dH=h-.165-.17;
 parts.push(roundedBox('oven-door','steel',[.012,front,dz],[w-.024,.045,dH],.01));
 parts.push(roundedBox('oven-glass','black-glass',[.08,front+.045,dz+.09],[w-.16,.003,dH-.16],.012,{collision:false}));
 parts.push(...barHandle('handle','steel',[.07,front+.045,dz+dH-.045],[1,0,0],[0,1,0],{length:w-.14,radius:.0095,standoff:.04,postRadius:.0075}));
 parts.push(roundedBox('drawer','enamel',[.012,front,.095],[w-.024,.035,.065],.006));
 parts.push(roundedBox('drawer-pull','dark',[w/2-.07,front+.035,.135],[.14,.004,.012],.004,{collision:false}));
 return parts.map(checkDetailPart);
}
export function counterDetail(recipe){
 const {width:w,depth:d,height:h}=recipe.parameters,parts=[],fy=d-FRONT;
 baseCarcass(parts,w,d,h);
 // Top drawer above a pair of shaker doors, 3 mm reveals all round.
 const top=h-.04-REVEAL,drawerH=.14,doorTop=top-drawerH-REVEAL;
 shakerFront(parts,'drawer','enamel','enamel',REVEAL,fy,top-drawerH,w-2*REVEAL,drawerH,{frame:.045});
 parts.push(...barHandle('drawer-pull','steel',[w/2-.08,fy+FRONT_T,top-drawerH/2],[1,0,0],[0,1,0],{length:.16,radius:.006,standoff:.028}));
 const W=(w-3*REVEAL)/2;
 for(let i=0;i<2;i++){const x=REVEAL+i*(W+REVEAL);shakerFront(parts,`door:${i}`,'enamel','enamel',x,fy,.11+REVEAL,W,doorTop-.11-REVEAL);
  parts.push(...barHandle(`pull:${i}`,'steel',[i?x+.04:x+W-.04,fy+FRONT_T,doorTop-.05-.16],[0,0,1],[0,1,0],{length:.16,radius:.006,standoff:.028}));}
 return parts.map(checkDetailPart);
}
export function kitchenSinkDetail(recipe){
 const {width:w,depth:d,height:h}=recipe.parameters,parts=[],front=d-FRONT;
 // Fixture anchor stays at index 0 (fixtureUse placement).
 baseCarcass(parts,w,d,h,{worktop:false,hollow:true});
 const x=w*.16,y=d*.22,W=w*.68,D=d*.56,t=.012,z=h-.22,top=h-.04;
 const slab=(id,X0,X1,profile)=>parts.push(profileExtrude(id,'stone',profile,X0,X1));
 slab('top-left',0,x,roundedProfile(0,d,top,h,{ft:.008,fb:.003}));
 slab('top-right',x+W,w,roundedProfile(0,d,top,h,{ft:.008,fb:.003}));
 slab('top-back',x,x+W,roundedProfile(0,y,top,h,{}));
 slab('top-front',x,x+W,roundedProfile(y+D,d,top,h,{ft:.008,fb:.003}));
 // Inset brushed basin: rounded floor, walls, and a flat flange on the stone.
 parts.push(roundedBox('bowl-bottom','steel',[x+.004,y+.004,z],[W-.008,D-.008,t],.006));
 for(const [i,X]of [x,x+W-t].entries())parts.push(roundedBox(`bowl-side:${i}`,'steel',[X,y,z],[t,D,h-z+.002],.004));
 for(const [i,Y]of [y,y+D-t].entries())parts.push(roundedBox(`bowl-end:${i}`,'steel',[x,Y,z],[W,t,h-z+.002],.004));
 for(const [i,[X,Y,WW,DD]]of [[x-.018,y-.018,W+.036,.022],[x-.018,y+D-.004,W+.036,.022],[x-.018,y,.022,D],[x+W-.004,y,.022,D]].entries())parts.push(roundedBox(`flange:${i}`,'steel',[X,Y,h],[WW,DD,.004],.0018,{collision:false}));
 parts.push(lathe('drain','steel',[x+W/2,y+D/2],[[0,z+t],[.042,z+t],[.042,z+t+.004],[.034,z+t+.006],[.012,z+t+.003],[0,z+t+.003]],{segments:24,collision:false}));
 // Gooseneck mixer: turned base, riser, swept arc spout, aerator and side lever.
 const tx=x+W/2,ty=y-.05;
 parts.push(lathe('tap-base','steel',[tx,ty],[[0,h],[.03,h],[.03,h+.012],[.022,h+.03],[.018,h+.05],[0,h+.05]],{segments:24}));
 parts.push(rod('tap-riser','steel',[tx,ty,h+.045],[tx,ty,h+.3],.0145,{segments:18}));
 const R=.11,cz=h+.3,steps=10;let prev=[tx,ty,cz];
 for(let k=1;k<=steps;k++){const a=Math.PI*k/steps,pt=[tx,ty+R-R*Math.cos(a),cz+R*Math.sin(a)];parts.push(rod(`tap-spout:${k}`,'steel',prev,pt,.0135,{segments:16,collision:false}));prev=pt;}
 parts.push(lathe('tap-aerator','steel',[tx,ty+2*R],[[0,cz-.035],[.0135,cz-.035],[.0145,cz-.02],[.0135,cz],[0,cz]],{segments:18,collision:false}));
 parts.push(rod('tap-lever','steel',[tx+.018,ty,h+.22],[tx+.075,ty+.02,h+.245],.0055,{segments:10,collision:false}));
 const Wd=(w-3*REVEAL)/2,doorTop=top-REVEAL;
 shakerFront(parts,'false-front','enamel','enamel',REVEAL,front,doorTop-.14,w-2*REVEAL,.14,{frame:.045});
 for(let i=0;i<2;i++){const X=REVEAL+i*(Wd+REVEAL),dT=doorTop-.14-REVEAL;shakerFront(parts,`door:${i}`,'enamel','enamel',X,front,.11+REVEAL,Wd,dT-.11-REVEAL);
  parts.push(...barHandle(`pull:${i}`,'steel',[i?X+.04:X+Wd-.04,front+FRONT_T,dT-.05-.16],[0,0,1],[0,1,0],{length:.16,radius:.006,standoff:.028}));}
 return parts.map(checkDetailPart);
}
