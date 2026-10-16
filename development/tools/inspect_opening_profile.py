"""Read-only source silhouette audit; outputs evidence, never edits the asset catalogue.

PZ 2x wall plane: x=64 +/- 64*u, y=32*u + 192*v, v downward.
A silhouette bound is not automatically an aperture: handles, shadows and open poses
can extend past a leaf. Review results before authoring a physical profile.
"""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('tile', nargs='+')
parser.add_argument('--assets', type=Path, default=Path(__file__).resolve().parents[1]/'private-assets')
parser.add_argument('--output', type=Path, required=True)
args=parser.parse_args()
atlas=json.loads((args.assets/'atlas.json').read_text())['regions']
properties=json.loads((args.assets/'world/properties.json').read_text())
args.output.mkdir(parents=True,exist_ok=True)
records=[]
for tile in args.tile:
    r=atlas[tile];p=properties.get(tile,{})
    axes=[axis for axis in ['N','W'] if 'door'+axis in p or 'window'+axis in p]
    if len(axes)!=1: raise ValueError(f'{tile}: unique closed opening axis required')
    axis=axes[0];scale=r['scale'];path=args.assets/r['page']
    im=Image.open(path).convert('RGBA').crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
    im.save(args.output/(tile+'.png'))
    points=[]
    for y in range(im.height):
        for x in range(im.width):
            if im.getpixel((x,y))[3]<128: continue
            u=((x+r['ox'])/scale-32)/32*(1 if axis=='N' else -1)
            v=((y+r['oy'])/scale-16*u)/96
            points.append((u,v))
    if not points: raise ValueError(f'{tile}: no opaque silhouette')
    bounds=[min(p[i] for p in points) for i in range(2)]+[max(p[i] for p in points) for i in range(2)]
    records.append(dict(tile=tile,axis=axis,region=r,pageSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),alphaThreshold=128,wallPlaneBounds=bounds,evidence='source-silhouette; physical aperture requires review'))
(args.output/'profiles.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps(records,indent=2))
