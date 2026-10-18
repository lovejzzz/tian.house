// Opening coordinates in the source wall's physical plane, not atlas pixels.
// Keep this independent of rendering so the aperture and runtime jambs agree.
export function windowProfile(properties={}){
 const raw=properties.TianWindowProfile;if(raw===undefined)return null;
 let rect;try{rect=typeof raw==='string'?JSON.parse(raw):raw;}catch{throw Error('Invalid window profile');}
 if(!Array.isArray(rect)||rect.length!==4||rect.some(n=>!Number.isFinite(n)||n<0||n>1)||rect[0]>=rect[2]||rect[1]>=rect[3])throw Error('Invalid window profile');
 return [...rect];
}

export function windowAperture(profile,wallLength=1){
 const rect=windowProfile({TianWindowProfile:profile});
 if(!Number.isFinite(wallLength)||wallLength<1)throw Error('Window needs at least one source wall plane');
 const [left,top,right,bottom]=rect,origin=(wallLength-1)/2;
 return {left:origin+left,right:origin+right,top,bottom,width:right-left,
  center:origin+(left+right)/2,t0:(origin+left)/wallLength,t1:(origin+right)/wallLength};
}

// Rectangles covering only the wall around the aperture. The leaf is drawn at
// its original one-cell size, rather than stretched into the smaller hole.
export function windowSurroundRectangles(profile,wallLength=1){
 const a=windowAperture(profile,wallLength);
 return [[0,0,a.left,1],[a.right,0,wallLength-a.right,1],
  [a.left,0,a.width,a.top],[a.left,a.bottom,a.width,1-a.bottom]]
  .filter(r=>r[2]>0&&r[3]>0);
}

// Door leaves use the same wall-plane aperture geometry, with a floor-level base.
export const hasOpeningProfile=p=>p?.TianWindowProfile!==undefined||p?.TianDoorProfile!==undefined;
export function doorProfile(p={}){
 if(p.TianDoorProfile===undefined)return null;
 const profile=windowProfile({TianWindowProfile:p.TianDoorProfile});
 if(profile[3]!==1)throw Error('Door profile must reach the floor');
 return profile;
}
