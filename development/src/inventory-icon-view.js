import {definition} from './inventory.js';
import {inventoryIcon} from './item-icons.js';
// Original atlas artwork, no guessed replacement. Loading reuses renderer cache.
export function createItemIcon(item,renderer){
 const d=definition(item.type),name=inventoryIcon(item,d.properties),canvas=document.createElement('canvas');canvas.width=canvas.height=40;canvas.className='item-icon';canvas.setAttribute('aria-label',d.name);canvas.style.flex='0 0 40px';
 const region=renderer.atlas.regions[name];if(!region)return canvas;
 const paint=()=>{const image=renderer.images.get(region.page);if(!image)return;const c=canvas.getContext('2d'),scale=32/Math.max(region.ow,region.oh,32);c.clearRect(0,0,40,40);c.drawImage(image,region.x,region.y,region.w,region.h,(40-region.ow*scale)/2+region.ox*scale,(40-region.oh*scale)/2+region.oy*scale,region.w*scale,region.h*scale);};
 if(renderer.page(region.page))paint();else renderer.loading.get(region.page)?.then(paint);return canvas;
}
