import {periodicNoise} from './material-relief.js?v=1d7ffb1877ce';
// Authored high-resolution surfaces replacing 128 px reprojections of sprite art.
// All are seamless (periodic) tiles with physical repeat sizes set by the recipe.
// Colour kinds (oak floor, lawn) return final albedo for a white material; tint
// kinds (fabric, quartz, walnut) return luminance for the material colour.
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function rng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function fbm(u,v,base,octaves,seed){let s=0,a=.5,t=0;for(let o=0;o<octaves;o++){const p=base*2**o;s+=a*periodicNoise(u*p,v*p,p,seed+o);t+=a;a*=.5;}return s/t;}
function check(size,max=1024){if(!Number.isInteger(size)||size<32||size>max||(size&(size-1)))throw Error('Invalid procedural surface size');}
function image(size){return {width:size,height:size,color:new Uint8Array(size*size*4),roughness:new Uint8Array(size*size*4),relief:new Uint8Array(size*size*4)};}
// Direct writes: called once per texel of every generated surface at startup.
function put(img,i,rgb,rough,height){const j=i*4,c=img.color,q=Math.round(255*clamp(rough)),h=Math.round(255*clamp(height)),R=img.roughness,H=img.relief;
 c[j]=Math.round(255*clamp(rgb[0]));c[j+1]=Math.round(255*clamp(rgb[1]));c[j+2]=Math.round(255*clamp(rgb[2]));c[j+3]=255;R[j]=R[j+1]=R[j+2]=q;R[j+3]=255;H[j]=H[j+1]=H[j+2]=h;H[j+3]=255;}

// Oiled oak floorboards: ~14 cm boards, random staggered butt joints (periodic per
// row), per-board tone, flat-sawn cathedral grain, rays, pores and the odd knot.
export function oakFloorPixels({size=1024,boards=10,seed=5}={}){
 check(size);if(!Number.isInteger(boards)||boards<2||boards>32)throw Error('Invalid oak floor');
 const img=image(size),r=rng(seed),rows=[];
 for(let b=0;b<boards;b++){const joints=[r()],count=r()<.5?2:1;if(count===2)joints.push((joints[0]+.35+r()*.3)%1);joints.sort((a,c)=>a-c);
  rows.push({joints,boards:joints.map(()=>({tone:r(),hue:r(),grainSeed:Math.floor(r()*1e6),centre:r()*4-2,knot:r()<.22?[r(),r()*.6+.2]:null}))});}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size,row=Math.min(boards-1,Math.floor(v*boards)),R=rows[row],lv=v*boards-row;
  let k=R.joints.findIndex(j=>u<j);if(k<0)k=0;const board=R.boards[(k+R.boards.length-1)%R.boards.length];
  const jointDist=Math.min(...R.joints.map(j=>Math.min(Math.abs(u-j),1-Math.abs(u-j))))*size;
  const seamDist=Math.min(lv,1-lv)*size/boards;
  // Cathedral grain: distance to a virtual log centre, warped along the board.
  const warp=.5*(fbm(u+board.grainSeed%7*.13,lv*.7,3,4,board.grainSeed%97)-.5);
  const ring=Math.abs((lv-.5)*1.6+board.centre)*(1+.6*Math.cos(u*Math.PI*2))+warp;
  const rings=.5+.5*Math.sin(ring*(14+8*board.hue)+3*fbm(u,lv,6,2,board.grainSeed%89));
  const fibre=periodicNoise(u*6,v*size/3,6,seed+5);
  const late=.55*smooth(.6,.98,rings)+.25*fibre;
  const pores=periodicNoise(u*40,v*700,40,seed+3);
  let knot=0;if(board.knot){const [kx,ky]=board.knot,du=Math.min(Math.abs(u-kx),1-Math.abs(u-kx)),d=Math.hypot(du*boards*.6,(lv-ky)*2.2);knot=1-smooth(.05,.22,d);}
  const tone=.8+.26*(board.tone-.5)+.05*(fbm(u*2,lv,2,2,board.grainSeed%71)-.5);
  // Honey oak in linear-ish sRGB, darker late wood, pores and knots.
  let col=[.72*tone,.52*tone,.33*tone].map((c,i)=>c*(1-.16*late-.08*pores*(pores>.62)-.45*knot)+(i===0?.02:0)*(board.hue-.5));
  const seam=seamDist<1.1||jointDist<1.1,bevel=1-smooth(0,2.6,Math.min(seamDist,jointDist));
  if(seam)col=col.map(c=>c*.38);
  const rough=.48+.12*periodicNoise(u*8,v*8,8,seed+9)+.08*late+(seam?.35:0);
  const height=.6+.08*(late-.5)-.05*pores-.55*bevel;
  put(img,y*size+x,col,rough,height);
 }
 return img;
}

// Mown lawn seen from above: thatch and soil under thousands of blade strokes,
// with patchy tone, a few clover clusters and dried tips.
export function lawnPixels({size=1024,seed=11,blades=90000}={}){
 check(size);const img=image(size),r=rng(seed),acc=new Float32Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size,t=fbm(u,v,6,4,seed),i=(y*size+x)*4;acc.set([.16+.06*t,.13+.05*t,.07+.02*t,.15],i);}
 const scale=size/1024;
 for(let n=0;n<blades*scale;n++){ // 1 px blades: count scales linearly so coverage matches at any size
  const x0=r()*size,y0=r()*size,a=r()*Math.PI*2,len=(5+r()*11)*scale,w=r(),patch=fbm(x0/size,y0/size,5,3,seed+5);
  const dry=r()<.06+.08*smooth(.6,.8,patch);
  const base=dry?[.42,.38,.18]:[.12+.1*w+.06*patch,.3+.16*w+.08*patch,.07+.04*w];
  for(let s=0;s<len;s++){const t=s/len,px=Math.round(x0+Math.cos(a)*s),py=Math.round(y0+Math.sin(a)*s),i=(((py%size)+size)%size*size+((px%size)+size)%size)*4,light=.75+.4*t;
   acc[i]=base[0]*light;acc[i+1]=base[1]*light;acc[i+2]=base[2]*light;acc[i+3]=Math.max(acc[i+3],.45+.5*t);}
 }
 for(let c=0;c<14;c++){const cx=r()*size,cy=r()*size,rad=(10+r()*18)*scale;for(let k=0;k<40;k++){const a=r()*Math.PI*2,d=r()*rad,x=Math.round(cx+Math.cos(a)*d),y=Math.round(cy+Math.sin(a)*d);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){if(dx*dx+dy*dy>5)continue;const i=((((y+dy)%size)+size)%size*size+(((x+dx)%size)+size)%size)*4;acc.set([.14,.36,.12,.7],i);}}}
 for(let i=0;i<size*size;i++)put(img,i,[acc[i*4],acc[i*4+1],acc[i*4+2]],.95,acc[i*4+3]);
 return img;
}

// Engineered quartz worktop: very fine low-contrast aggregate, soft clouding and a
// few faint veins (not terrazzo speckle). Tint comes from the material colour.
export function quartzPixels({size=1024,seed=83,veins=2}={}){
 check(size);const img=image(size),r=rng(seed),vein=[];for(let k=0;k<veins;k++)vein.push([r(),r()*2*Math.PI,r()*.5+.5]);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size,cloud=fbm(u,v,3,4,seed),grain=periodicNoise(u*320,v*320,320,seed+1),fleck=periodicNoise(u*180,v*180,180,seed+2);
  const wobble=.28*fbm(u,v,2,4,seed+3);let veinTone=0;for(const [o,a,s] of vein){const d=Math.abs(Math.sin(((u*Math.cos(a)+v*Math.sin(a))+o+wobble)*Math.PI*2*s));veinTone=Math.max(veinTone,(1-smooth(0,.06,d))*(.4+.6*fbm(u,v,3,2,seed+4)));}
  const sparkle=fleck>.86?(fleck-.86)*1.8:0;
  const c=.95+.05*(cloud-.5)+.02*(grain-.5)-.035*veinTone+.025*sparkle;
  put(img,y*size+x,[c,c,c],.32+.1*cloud+.05*grain,.5+.12*(grain-.5));
 }
 return img;
}

// Upholstery and bedding cloth: yarn-level weave with two-ply heather, slubs and
// soft pile variation. Luminance only; the material colour is the dye.
export function fabricPixels({size=512,weave='linen',threads=[96,96],seed=41}={}){
 check(size);if(!['linen','boucle','percale','basket'].includes(weave)||threads.length!==2||threads.some(n=>!Number.isInteger(n)||n<8||n>size/2||n%2))throw Error('Invalid fabric recipe');
 const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const U=(x+.5)/size,V=(y+.5)/size,u=U*threads[0],v=V*threads[1],iu=Math.floor(u),iv=Math.floor(v);
  const cell=weave==='basket'?(Math.floor(iu/2)+Math.floor(iv/2))%2:(iu+iv)%2;
  const warpShape=Math.sin(Math.PI*(u%1)),weftShape=Math.sin(Math.PI*(v%1));
  const top=cell?warpShape:weftShape,under=cell?weftShape:warpShape;
  const yarnU=periodicNoise(iu+.5,V*6,threads[0],seed)-.5,yarnV=periodicNoise(U*6,iv+.5,threads[1],seed+1)-.5;
  const ply=cell?yarnU:yarnV,slub=weave==='linen'?Math.max(0,periodicNoise(U*threads[0]/4,V*3,threads[0]/4,seed+2)-.72)*2.5:0;
  const loops=weave==='boucle'?periodicNoise(U*size/6,V*size/6,size/6,seed+3):0;
  const mott=fbm(U,V,4,3,seed+4)-.5;
  let h=.2+.6*top+.15*under+(weave==='boucle'?.35*(loops-.5):0)+.2*slub;
  const c=.86+.1*(top-.5)+.12*ply+.05*mott+.06*slub+(weave==='boucle'?.12*(loops-.5):0)-(weave==='percale'?.04*(1-top):0);
  put(img,y*size+x,[c,c,c],.84+.12*(1-top),h);
 }
 return img;
}

// Walnut: plain-sawn cathedral figure with open pores; luminance for a walnut tint.
export function walnutPixels({size=512,seed=29}={}){
 check(size);const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size,warp=.18*(fbm(u,v,2,4,seed)-.5),ring=Math.abs((v-.5)*2.2)*(1+.4*Math.cos(u*Math.PI*2))+warp;
  const fibre=periodicNoise(u*5,v*size/3,5,seed+3);
  const late=.35*smooth(.55,.98,.5+.5*Math.sin(ring*40+2*fbm(u,v,8,2,seed+4)))+.3*fibre,pores=periodicNoise(u*30,v*500,30,seed+1),streak=fbm(u*.5,v*3,4,3,seed+2);
  const c=.9-.2*late-.08*(pores>.66)*pores+.1*(streak-.5);
  put(img,y*size+x,[c,c,c],.5+.12*late+.08*(pores>.64),.55-.15*late-.1*(pores>.64));
 }
 return img;
}

// Glazed ceramic: pooled-glaze tone, faint crazing, rare pinholes; glossy with
// slightly rougher pools.
export function ceramicPixels({size=512,seed=61}={}){
 check(size);const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,pool=fbm(u,v,3,4,seed),craze=Math.abs(periodicNoise(u*28,v*28,28,seed+1)-periodicNoise(u*28+.37,v*28+.71,28,seed+1)),pin=periodicNoise(u*220,v*220,220,seed+2)>.965?1:0;
  const c=.97+.05*(pool-.5)-.025*(craze<.02)-.08*pin;put(img,y*size+x,[c,c,c],.6+.5*pool+.4*pin,.5+.05*(pool-.5)-.2*pin-.06*(craze<.02));}
 return img;
}
// Satin paint/lacquer: orange-peel micro relief and faint roller/brush direction.
export function paintPixels({size=512,seed=67}={}){
 check(size);const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,peel=periodicNoise(u*90,v*90,90,seed),roll=periodicNoise(u*4,v*40,4,seed+1),broad=fbm(u,v,2,3,seed+2);
  const c=.97+.04*(broad-.5)+.02*(roll-.5);put(img,y*size+x,[c,c,c],.85+.25*(roll-.5)+.15*(peel-.5),.5+.25*(peel-.5));}
 return img;
}
// Moulded plastic/rubber: fine mould stipple (spark-eroded texture) with soft tone.
export function plasticPixels({size=256,seed=71}={}){
 check(size);const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,st=periodicNoise(u*120,v*120,120,seed),st2=periodicNoise(u*48,v*48,48,seed+1),broad=fbm(u,v,2,2,seed+2);
  const c=.96+.05*(broad-.5)+.04*(st-.5);put(img,y*size+x,[c,c,c],.9+.2*(st-.5),.5+.3*(st-.5)+.12*(st2-.5));}
 return img;
}
// Paper and card: fibre flecks, faint laid lines, soft cockle.
export function paperPixels({size=512,seed=73}={}){
 check(size);const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,fib=periodicNoise(u*160,v*40,160,seed),fleck=periodicNoise(u*260,v*260,260,seed+1),laid=.5+.5*Math.sin(v*Math.PI*2*48),cockle=fbm(u,v,3,3,seed+2);
  const c=.96+.04*(fib-.5)-.05*(fleck>.93)+.012*laid+.03*(cockle-.5);put(img,y*size+x,[c,c,c],.95,.5+.15*(fib-.5)+.1*(cockle-.5));}
 return img;
}
// Unglazed terracotta / soil: porous grog speckle, firing blush, coarse tooth.
export function terracottaPixels({size=512,seed=79}={}){
 check(size);const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,grog=periodicNoise(u*180,v*180,180,seed),pore=periodicNoise(u*300,v*300,300,seed+1),blush=fbm(u,v,2,3,seed+2);
  const c=.94+.1*(blush-.5)+.08*(grog-.5)-.12*(pore>.9)+.06*(grog>.85);put(img,y*size+x,[c,c,c],.95,.5+.3*(grog-.5)-.3*(pore>.9));}
 return img;
}
// Leaf blade: midrib and parallel veins along U, waxy cuticle sheen in roughness.
export function leafPixels({size=512,seed=83}={}){
 check(size);const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,veins=Math.pow(Math.abs(Math.sin(v*Math.PI*2*14)),18),rib=Math.exp(-(((v-.5)*40)**2)),mott=fbm(u,v,4,3,seed),cells=periodicNoise(u*200,v*200,200,seed+1);
  const c=.92+.08*(mott-.5)+.08*veins+.12*rib+.03*(cells-.5);put(img,y*size+x,[c,c,c],.55+.2*(mott-.5),.5+.2*veins+.25*rib+.05*(cells-.5));}
 return img;
}
// Sand-cast iron: granular cast skin with darker oxidised specks.
export function castIronPixels({size=256,seed=89}={}){
 check(size);const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,g=periodicNoise(u*110,v*110,110,seed),g2=periodicNoise(u*40,v*40,40,seed+1),ox=fbm(u,v,3,3,seed+2);
  const c=.9+.18*(g-.5)+.1*(ox-.5);put(img,y*size+x,[c,c,c],.85+.3*(g-.5),.5+.35*(g-.5)+.15*(g2-.5));}
 return img;
}
// Matt emulsion on plaster: roller stipple, soft trowel undulation, faint broad
// patchiness from coats; low contrast so walls read painted, not dirty.
export function wallPaintPixels({size=1024,seed=37}={}){
 check(size);const img=image(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,stip=periodicNoise(u*260,v*260,260,seed),stip2=periodicNoise(u*90,v*90,90,seed+1),trowel=fbm(u,v,3,4,seed+2),patch=fbm(u,v,1,3,seed+3),lap=periodicNoise(u*6,v*1,6,seed+4);
  const c=.955+.05*(patch-.5)+.025*(trowel-.5)+.018*(stip-.5)+.012*(lap-.5);put(img,y*size+x,[c,c,c],.88+.12*(stip-.5)+.08*(lap-.5),.5+.22*(stip-.5)+.14*(stip2-.5)+.2*(trowel-.5));}
 return img;
}

// Washed river-gravel ballast (16–32 mm) on a flat roof membrane: periodic jittered
// pebble lattice, each stone a rounded ellipse with its own tone (grey, buff,
// slate), a domed relief and dark interstices where the membrane shows.
export function gravelPixels({size=512,seed=61,stones=26}={}){
 check(size);if(!Number.isInteger(stones)||stones<6||stones>64)throw Error('Invalid gravel');
 const img=image(size),r=rng(seed),cells=[];
 for(let j=0;j<stones;j++)for(let i=0;i<stones;i++){const kind=r();cells.push({x:(i+.15+.7*r())/stones,y:(j+.15+.7*r())/stones,rx:(.42+.2*r())/stones,ry:(.32+.18*r())/stones,a:r()*Math.PI,
  col:kind<.45?[.55,.54,.52]:kind<.75?[.62,.56,.47]:kind<.92?[.4,.41,.42]:[.7,.68,.64],tone:.8+.35*r()});}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,ci=Math.floor(u*stones),cj=Math.floor(v*stones);let best=null,bd=2;
  for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ii=(ci+di+stones)%stones,jj=(cj+dj+stones)%stones,c=cells[jj*stones+ii];let du=u-c.x,dv=v-c.y;du-=Math.round(du);dv-=Math.round(dv);
   const cs=Math.cos(c.a),sn=Math.sin(c.a),p=(du*cs+dv*sn)/c.rx,q=(-du*sn+dv*cs)/c.ry,d=p*p+q*q;if(d<bd){bd=d;best=c;}}
  const grain=periodicNoise(u*size/3,v*size/3,size/3,seed+1),mottle=fbm(u,v,4,3,seed+2);
  if(bd<1){const dome=Math.sqrt(1-bd),t=best.tone*(.82+.25*dome)*(1+.12*(grain-.5)),c=best.col.map(k=>k*t*(.95+.1*mottle));put(img,y*size+x,c,.62+.25*(grain-.5)-.1*dome,.25+.7*dome+.05*(grain-.5));}
  else{const m=.12+.05*mottle;put(img,y*size+x,[m,m,m*1.05],.9,.05);}}
 return img;
}

export const PROCEDURAL_SURFACES={'oak-floor':oakFloorPixels,lawn:lawnPixels,quartz:quartzPixels,fabric:fabricPixels,walnut:walnutPixels,ceramic:ceramicPixels,paint:paintPixels,plastic:plasticPixels,paper:paperPixels,terracotta:terracottaPixels,leaf:leafPixels,'cast-iron':castIronPixels,'wall-paint':wallPaintPixels,gravel:gravelPixels};
export const isProceduralSurface=kind=>Object.hasOwn(PROCEDURAL_SURFACES,kind);
// Albedo kinds already carry colour; tint kinds multiply the material colour.
export const ALBEDO_SURFACES=new Set(['oak-floor','lawn','gravel']);
