import {roundedBox,lathe,rod,knob,rotatePart,boxProxy,checkDetailPart} from './detail-geometry.js?v=a890ced93fdd';
// Bathroom ceramics as turned, glazed forms: open bowls with visible interiors,
// rims, water surfaces and real tap bodies. Dimensions are design assumptions for
// a close-coupled toilet and pedestal basin. Interaction anchors come from recipe
// parameters (seat and hand targets), so the forms may change without moving them.
export function toiletDetail(recipe){
 const {width:w,depth:d,height:h}=recipe.parameters,parts=[],c=[w/2,d*.56],S=[1,1.38],seat=.45;
 // Index 0: pedestal foot rising into the pan, then rolling over the rim and down
 // into the glazed bowl. One continuous surface, open at the top.
 parts.push(lathe('base','ceramic',c,[[.125,0],[.13,.006],[.118,.05],[.104,.15],[.112,.24],[.15,.31],[.182,.36],[.195,.405],[.196,seat-.012],[.188,seat-.004],[.168,seat-.006],[.152,seat-.03],[.118,seat-.11],[.075,seat-.17],[.05,seat-.2],[.04,seat-.205]],{segments:40,scale:S,capTop:false}));
 parts.push(lathe('water','water',c,[[.07,seat-.19],[0,seat-.19]],{segments:32,scale:S,capBottom:false,capTop:false,collision:false}));
 // Seat ring: closed loop profile, slightly overhanging the rim.
 parts.push(lathe('seat','enamel',c,[[.125,seat],[.198,seat],[.206,seat+.008],[.202,seat+.022],[.13,seat+.025],[.118,seat+.012],[.125,seat]],{segments:40,scale:S,capBottom:false,capTop:false}));
 // Raised lid resting just in front of the cistern, hinged at the back of the seat.
 const lid=lathe('cover-lid','enamel',c,[[0,seat+.025],[.2,seat+.025],[.206,seat+.032],[.198,seat+.042],[0,seat+.044]],{segments:40,scale:S,collision:false});
 const hingeY=c[1]-.198*S[1]+.01;parts.push(rotatePart(lid,[w/2,hingeY,seat+.03],[1,0,0],Math.PI*.515));
 for(const k of [-1,1])parts.push(lathe(`hinge:${k}`,'steel',[w/2+k*.075,hingeY+.012],[[0,seat-.004],[.012,seat-.004],[.012,seat+.026],[.009,seat+.032],[0,seat+.032]],{segments:16,collision:false}));
 // Close-coupled cistern with an overhanging lid and a chrome dual-flush button.
 parts.push(roundedBox('cistern','ceramic',[.045,0,.4],[w-.09,d*.2,h-.4],.028));
 parts.push(roundedBox('lid','ceramic',[.035,-.004,h-.004],[w-.07,d*.2+.012,.028],.012));
 parts.push(lathe('flush','steel',[w/2,d*.105],[[0,h+.024],[.024,h+.024],[.025,h+.028],[.022,h+.032],[0,h+.032]],{segments:24,collision:false}));
 parts.push(roundedBox('flush-split','dark',[w/2-.0008,d*.105-.022,h+.031],[.0016,.044,.0015],.0006,{collision:false}));
 return parts.map(checkDetailPart);
}
export function pedestalBasinDetail(recipe){
 const {width:w,depth:d,height:h}=recipe.parameters,parts=[],c=[w/2,d*.55],S=[1.3,1],R=w*.36;
 // Index 0 is the basin (hand-rinse anchor uses recipe dimensions, not the part).
 parts.push(lathe('basin','ceramic',c,[[R*.42,h-.2],[R*.7,h-.16],[R*.9,h-.1],[R*.98,h-.04],[R,h-.012],[R*.98,h],[R*.9,h-.004],[R*.86,h-.02],[R*.78,h-.07],[R*.58,h-.12],[R*.3,h-.145],[R*.12,h-.15]],{segments:44,scale:S,capTop:false}));
 // The bowl stays physically open for hand rinsing: collision is a ring of rim
 // blocks plus the bowl floor, never one box filling the cavity.
 parts[0].collision=[...Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,x=c[0]+Math.cos(a)*R*.93*S[0],y=c[1]+Math.sin(a)*R*.93*S[1];return boxProxy(x-.035,y-.035,h-.1,.07,.07,.1);}),boxProxy(c[0]-R*.6,c[1]-R*.6,h-.2,R*1.2,R*1.2,.05)];
 parts.push(lathe('pedestal','ceramic',[w/2,d*.42],[[.13,0],[.135,.006],[.11,.06],[.085,.3],[.08,h-.35],[.1,h-.24],[.13,h-.19],[0,h-.19]],{segments:32,scale:[1.15,1],capTop:false}));
 parts.push(lathe('drain','steel',[c[0],c[1]+.01],[[0,h-.151],[.022,h-.151],[.022,h-.147],[.016,h-.146],[0,h-.146]],{segments:20,collision:false}));
 parts.push(roundedBox('overflow','dark',[c[0]-.018,c[1]+R*.83,h-.045],[.036,.006,.01],.004,{collision:false}));
 // Monobloc mixer on the rear deck: turned body, spout reaching over the bowl, lever.
 const tx=c[0],ty=c[1]-R*.86;
 parts.push(lathe('tap-riser','steel',[tx,ty],[[0,h],[.026,h],[.026,h+.008],[.019,h+.02],[.017,h+.15],[.019,h+.16],[0,h+.165]],{segments:24}));
 parts.push(rod('tap-spout','steel',[tx,ty,h+.145],[tx,ty+.12,h+.135],.011,{segments:16,collision:false}));
 parts.push(lathe('tap-aerator','steel',[tx,ty+.12],[[0,h+.12],[.012,h+.12],[.012,h+.142],[0,h+.142]],{segments:16,collision:false}));
 parts.push(rod('tap-lever','steel',[tx,ty-.004,h+.163],[tx,ty-.05,h+.172],.006,{segments:10,collision:false}));
 return parts.map(checkDetailPart);
}
export function showerDetail(recipe){
 const {width:w,depth:d,height:h}=recipe.parameters,parts=[],g=.008;
 // Flush tray (walk-in), framed glass on three sides, brushed channel profiles.
 const tray=roundedBox('tray','ceramic',[0,0,0],[w,d,.004],.002);tray.collision=[];tray.nonblocking=true;parts.push(tray);
 parts.push(roundedBox('back-panel','glass',[.02,.006,.03],[w-.04,g,h-.06],.003));
 for(const [i,x]of [[0,.006],[1,w-.006-g]])parts.push(roundedBox(`side-panel:${i}`,'glass',[x,.02,.03],[g,d-.04,h-.06],.003));
 for(const [i,x]of [0,w-.022].entries())for(const [j,y]of [0,d-.022].entries())parts.push(roundedBox(`post:${i}:${j}`,'steel',[x,y,0],[.022,.022,h],.006));
 parts.push(roundedBox('back-rail','steel',[0,0,h-.022],[w,.022,.022],.006));
 for(const [i,x]of [0,w-.022].entries()){parts.push(roundedBox(`side-rail:${i}`,'steel',[x,0,h-.022],[.022,d,.022],.006));parts.push(roundedBox(`side-shoe:${i}`,'steel',[x,0,0],[.022,d,.03],.004,{collision:false}));}
 parts.push(roundedBox('back-shoe','steel',[0,0,0],[w,.022,.03],.004,{collision:false}));
 // Thermostatic bar mixer with two dials, riser rail with slider, fixed head.
 parts.push(roundedBox('mixer','steel',[w/2-.16,.02,1.0],[.32,.05,.055],.022));
 for(const [i,x]of [w/2-.12,w/2+.12].entries())parts.push(knob(`mixer-dial:${i}`,'steel',[x,.07,1.0275],{radius:.026,depth:.03}));
 parts.push(rod('riser','steel',[w/2,.04,1.06],[w/2,.04,h-.12],.011,{segments:16}));
 parts.push(roundedBox('rail-slider','steel',[w/2-.018,.028,1.5],[.036,.04,.06],.012,{collision:false}));
 parts.push(rod('shower-arm','steel',[w/2,.04,h-.12],[w/2,d*.35,h-.12],.01,{segments:14,collision:false}));
 parts.push(lathe('shower-head','steel',[w/2,d*.35],[[0,h-.15],[.1,h-.15],[.11,h-.142],[.105,h-.128],[.03,h-.12],[0,h-.12]],{segments:40,collision:false}));
 parts.push(lathe('shower-face','dark',[w/2,d*.35],[[0,h-.1505],[.095,h-.1505]],{segments:40,capBottom:true,capTop:false,collision:false}));
 parts.push(lathe('drain','steel',[w/2,d*.5],[[0,.004],[.05,.004],[.05,.0055],[0,.0055]],{segments:28,collision:false}));
 return parts.map(checkDetailPart);
}
