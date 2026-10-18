// Geometry for the polygon-room extension. Coordinates are in source-grid units,
// not pixels. Rendering, compilation and collision must consume the same edges.
export const POLYGON_EPSILON=1e-9;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const same=(a,b)=>Math.abs(a[0]-b[0])<POLYGON_EPSILON&&Math.abs(a[1]-b[1])<POLYGON_EPSILON;
export const polygonSignedArea=points=>{if(points.length<3)return 0;const origin=points[0];return points.reduce((sum,a,i)=>sum+cross(origin,a,points[(i+1)%points.length]),0)/2;};
function onSegment(p,a,b){return Math.abs(cross(a,b,p))<POLYGON_EPSILON&&p[0]>=Math.min(a[0],b[0])-POLYGON_EPSILON&&p[0]<=Math.max(a[0],b[0])+POLYGON_EPSILON&&p[1]>=Math.min(a[1],b[1])-POLYGON_EPSILON&&p[1]<=Math.max(a[1],b[1])+POLYGON_EPSILON;}
export function segmentsIntersect(a,b,c,d){
 const u=cross(a,b,c),v=cross(a,b,d),s=cross(c,d,a),t=cross(c,d,b);
 return (u>POLYGON_EPSILON&&v< -POLYGON_EPSILON||u< -POLYGON_EPSILON&&v>POLYGON_EPSILON)&&(s>POLYGON_EPSILON&&t< -POLYGON_EPSILON||s< -POLYGON_EPSILON&&t>POLYGON_EPSILON)||onSegment(c,a,b)||onSegment(d,a,b)||onSegment(a,c,d)||onSegment(b,c,d);
}
export function pointInPolygon(point,vertices,{boundary=true}={}){
 let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
  const a=vertices[j],b=vertices[i];if(onSegment(point,a,b))return boundary;
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;
}
export function normalizeFootprintPolygon(input,{bounds,maxCells=50000}={}){
 if(!Array.isArray(input)||input.length<3||input.length>256||input.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isSafeInteger(n)||Math.abs(n)>1e7)))throw Error('Use 3–256 grid vertices for a room outline');
 let vertices=input.map(p=>[...p]);if(same(vertices[0],vertices.at(-1)))vertices.pop();if(vertices.length<3)throw Error('A room needs at least three corners');
 for(let i=0;i<vertices.length;i++){
  const a=vertices[i],b=vertices[(i+1)%vertices.length],dx=b[0]-a[0],dy=b[1]-a[1];
  if(same(a,b)||dx&&dy&&Math.abs(dx)!==Math.abs(dy))throw Error('Use non-empty orthogonal or 45-degree wall segments');
  if(bounds&&(a[0]<bounds[0]||a[1]<bounds[1]||a[0]>=bounds[2]||a[1]>=bounds[3]))throw Error('Room outline must leave space for its boundary walls');
  for(let j=i+1;j<vertices.length;j++)if(j!==i+1&&!(i===0&&j===vertices.length-1)&&segmentsIntersect(a,b,vertices[j],vertices[(j+1)%vertices.length]))throw Error('Room outline cannot cross or touch itself');
  const previous=vertices[(i+vertices.length-1)%vertices.length];if(Math.abs(cross(previous,a,b))<POLYGON_EPSILON&&(a[0]-previous[0])*dx+(a[1]-previous[1])*dy<0)throw Error('Room walls cannot double back');
 }
 // Remove redundant points on straight runs so representation is stable.
 vertices=vertices.filter((p,i)=>Math.abs(cross(vertices[(i+vertices.length-1)%vertices.length],p,vertices[(i+1)%vertices.length]))>POLYGON_EPSILON);
 if(vertices.length<3||Math.abs(polygonSignedArea(vertices))<POLYGON_EPSILON)throw Error('Room outline has no floor area');
 const rect=[Math.min(...vertices.map(p=>p[0])),Math.min(...vertices.map(p=>p[1])),Math.max(...vertices.map(p=>p[0])),Math.max(...vertices.map(p=>p[1]))];
 if((rect[2]-rect[0])*(rect[3]-rect[1])>maxCells)throw Error('Room outline exceeds the supported cell budget');
 if(polygonSignedArea(vertices)<0)vertices.reverse();
 let first=0;for(let i=1;i<vertices.length;i++)if(vertices[i][0]<vertices[first][0]||vertices[i][0]===vertices[first][0]&&vertices[i][1]<vertices[first][1])first=i;
 return vertices.slice(first).concat(vertices.slice(0,first));
}
function inTriangle(p,a,b,c){return cross(a,b,p)>=-POLYGON_EPSILON&&cross(b,c,p)>=-POLYGON_EPSILON&&cross(c,a,p)>=-POLYGON_EPSILON;}
export function triangulateFootprint(vertices){
 const normalized=normalizeFootprintPolygon(vertices),remaining=normalized.map(p=>[...p]),triangles=[];
 while(remaining.length>3){let ear=-1;
  for(let i=0;i<remaining.length;i++){const a=remaining[(i+remaining.length-1)%remaining.length],b=remaining[i],c=remaining[(i+1)%remaining.length];if(cross(a,b,c)<=POLYGON_EPSILON)continue;if(remaining.some((p,j)=>j!==i&&j!==(i+1)%remaining.length&&j!==(i+remaining.length-1)%remaining.length&&inTriangle(p,a,b,c)))continue;ear=i;triangles.push([a,b,c]);break;}
  if(ear<0)throw Error('Room outline cannot be triangulated');remaining.splice(ear,1);
 }triangles.push(remaining);return triangles;
}
function clipHalfPlane(points,dim,bound,keepGreater){
 if(!points.length)return [];const out=[],inside=p=>keepGreater?p[dim]>=bound-POLYGON_EPSILON:p[dim]<=bound+POLYGON_EPSILON;
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],aa=inside(a),bb=inside(b);if(aa)out.push(a);if(aa!==bb){const t=(bound-a[dim])/(b[dim]-a[dim]),p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];p[dim]=bound;out.push(p);}}
 return out.filter((p,i)=>!same(p,out[(i+out.length-1)%out.length]));
}
export function clipPolygonToCell(points,x,y){
 let clipped=points;for(const [dim,bound,greater]of [[0,x,true],[0,x+1,false],[1,y,true],[1,y+1,false]])clipped=clipHalfPlane(clipped,dim,bound,greater);
 return clipped.length>=3&&Math.abs(polygonSignedArea(clipped))>POLYGON_EPSILON?clipped:[];
}
export function polygonWallEdges(input){
 const vertices=normalizeFootprintPolygon(input),edges=[];
 for(let i=0;i<vertices.length;i++){
  const a=vertices[i],b=vertices[(i+1)%vertices.length],dx=b[0]-a[0],dy=b[1]-a[1],count=Math.max(Math.abs(dx),Math.abs(dy)),sx=Math.sign(dx),sy=Math.sign(dy);
  for(let n=0;n<count;n++){const p=[a[0]+sx*n,a[1]+sy*n],q=[p[0]+sx,p[1]+sy],axis=dy===0?'N':dx===0?'W':dx*dy>0?'D+':'D-';edges.push({axis,x:Math.min(p[0],q[0]),y:Math.min(p[1],q[1]),a:p,b:q,length:Math.hypot(sx,sy)});}
 }return edges;
}
export function compilePolygonFootprint(input,options={}){
 const vertices=normalizeFootprintPolygon(input,options),origin=vertices[0],local=vertices.map(p=>[p[0]-origin[0],p[1]-origin[1]]),triangles=triangulateFootprint(local),byCell=new Map();
 // Triangulation intersections may be fractional. Clip near zero to avoid
 // losing narrow pieces when a house is far from the world origin.
 // Clip triangles rather than the concave polygon directly: a cell can contain
 // disconnected pieces, which must not be bridged into an invented floor.
 for(const triangle of triangles){const minX=Math.floor(Math.min(...triangle.map(p=>p[0]))),maxX=Math.ceil(Math.max(...triangle.map(p=>p[0]))),minY=Math.floor(Math.min(...triangle.map(p=>p[1]))),maxY=Math.ceil(Math.max(...triangle.map(p=>p[1])));
  for(let x=minX;x<maxX;x++)for(let y=minY;y<maxY;y++){const polygon=clipPolygonToCell(triangle,x,y);if(!polygon.length)continue;const key=x+','+y;let cell=byCell.get(key);if(!cell){cell={x:x+origin[0],y:y+origin[1],area:0,polygons:[]};byCell.set(key,cell);}cell.area+=Math.abs(polygonSignedArea(polygon));cell.polygons.push(polygon.map(p=>[p[0]-x,p[1]-y]));}
 }
 const cells=[...byCell.values()].sort((a,b)=>a.x-b.x||a.y-b.y);for(const cell of cells){cell.full=Math.abs(cell.area-1)<POLYGON_EPSILON;if(cell.area>1+POLYGON_EPSILON)throw Error('Overlapping floor triangulation');}
 const area=polygonSignedArea(vertices);if(Math.abs(cells.reduce((sum,c)=>sum+c.area,0)-area)>1e-7)throw Error('Floor clipping did not preserve area');
 return {vertices,area,cells,edges:polygonWallEdges(vertices)};
}
export function chamferRectangle(rect,corner,distance){
 if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isSafeInteger)||rect[0]>=rect[2]||rect[1]>=rect[3]||!['NW','NE','SE','SW'].includes(corner)||!Number.isInteger(distance)||distance<1||distance>=Math.min(rect[2]-rect[0],rect[3]-rect[1]))throw Error('Choose a corner and a whole-cell cut smaller than the room');
 const [x0,y0,x1,y1]=rect,d=distance,vertices={NW:[[x0+d,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0+d]],NE:[[x0,y0],[x1-d,y0],[x1,y0+d],[x1,y1],[x0,y1]],SE:[[x0,y0],[x1,y0],[x1,y1-d],[x1-d,y1],[x0,y1]],SW:[[x0,y0],[x1,y0],[x1,y1],[x0+d,y1],[x0,y1-d]]}[corner];
 return normalizeFootprintPolygon(vertices);
}
// Parametric clipping of a segment against an axis-aligned box. Expanding a
// moving actor's box by the wall segment is equivalent to this swept test.
export function wallCrossesBox(a,b,rect){
 let lo=0,hi=1;for(let dim=0;dim<2;dim++){const delta=b[dim]-a[dim];if(Math.abs(delta)<POLYGON_EPSILON){if(a[dim]<rect[dim]-POLYGON_EPSILON||a[dim]>rect[dim+2]+POLYGON_EPSILON)return false;continue;}let near=(rect[dim]-a[dim])/delta,far=(rect[dim+2]-a[dim])/delta;if(near>far)[near,far]=[far,near];lo=Math.max(lo,near);hi=Math.min(hi,far);if(lo>hi+POLYGON_EPSILON)return false;}return true;
}
export function boundaryBlocksMovement(edges,from,to,radius=0){
 if(![...from,...to,radius].every(Number.isFinite)||radius<0)throw Error('Invalid movement geometry');
 // Runtime already substeps axis moves. Also handle a diagonal sweep exactly
 // by testing the convex hull of the swept square against each segment.
 const hullPoints=[];for(const p of [from,to])for(const [dx,dy]of [[-radius,-radius],[radius,-radius],[radius,radius],[-radius,radius]])hullPoints.push([p[0]+dx,p[1]+dy]);
 if(radius===0)return edges.some(e=>segmentsIntersect(from,to,e.a,e.b));
 const points=hullPoints.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),half=items=>{const out=[];for(const p of items){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;},lower=half(points),upper=half([...points].reverse()),hull=lower.slice(0,-1).concat(upper.slice(0,-1));
 return edges.some(e=>pointInPolygon(e.a,hull)||pointInPolygon(e.b,hull)||hull.some((a,i)=>segmentsIntersect(a,hull[(i+1)%hull.length],e.a,e.b)));
}

// Each clipped triangle is convex. Shared edges have zero area and are legal;
// using cell keys alone would reject two rooms occupying opposite half-cells.
export function convexIntersectionPolygon(subject,clip){
 let points=subject.map(p=>[...p]);const orientation=Math.sign(polygonSignedArea(clip));
 if(!orientation)return [];
 for(let i=0;i<clip.length&&points.length;i++){
  const a=clip[i],b=clip[(i+1)%clip.length],out=[];
  for(let j=0;j<points.length;j++){
   const p=points[j],q=points[(j+1)%points.length],dp=cross(a,b,p)*orientation,dq=cross(a,b,q)*orientation,insideP=dp>=-POLYGON_EPSILON,insideQ=dq>=-POLYGON_EPSILON;
   if(insideP)out.push(p);if(insideP!==insideQ){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }points=out;
 }return points;
}
export function convexIntersectionArea(subject,clip){return Math.abs(polygonSignedArea(convexIntersectionPolygon(subject,clip)));}
export function wallEdgeEndpoints(wall){
 const {x,y,axis}=wall;
 if(axis==='N')return [[x,y],[x+1,y]];
 if(axis==='W')return [[x,y],[x,y+1]];
 if(axis==='D+')return [[x,y],[x+1,y+1]];
 if(axis==='D-')return [[x,y+1],[x+1,y]];
 throw Error('Unsupported wall direction');
}
