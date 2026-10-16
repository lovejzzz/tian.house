"""Read-only integrity gate for installed raster atlases; no semantic guesses."""
import argparse
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'private-assets'


def check(root=ROOT):
    root = Path(root)
    manifest = json.loads((root/'atlas.json').read_text())
    if manifest.get('schema_version') != 1:
        raise ValueError('Unknown imported atlas schema')
    pages = {}
    total = 0
    for pack in manifest['packs']:
        for page in pack['pages']:
            name = page['file']
            if Path(name).name != name or Path(name).is_absolute():
                raise ValueError('Atlas page must be a local filename: '+name)
            if name in pages:
                raise ValueError('Duplicate atlas page: '+name)
            data = (root/name).read_bytes()
            if hashlib.sha256(data).hexdigest() != page['sha256']:
                raise ValueError('Atlas hash mismatch: '+name)
            if len(data) < 24 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
                raise ValueError('Invalid PNG header: '+name)
            dimensions = struct.unpack('>II', data[16:24])
            if dimensions != (page['width'], page['height']):
                raise ValueError('Atlas dimensions mismatch: '+name)
            pages[name] = page
            total += len(data)
    for key, region in manifest['regions'].items():
        page = pages.get(region['page'])
        if page is None:
            raise ValueError('Unknown atlas page for '+key)
        for field in ['x', 'y', 'w', 'h', 'ox', 'oy', 'ow', 'oh']:
            if type(region[field]) is not int:
                raise ValueError('Non-integer sprite coordinate: '+key+' '+field)
        if min(region['x'],region['y'],region['w'],region['h']) < 0 or region['x']+region['w'] > page['width'] or region['y']+region['h'] > page['height']:
            raise ValueError('Sprite outside atlas: '+key)
        if region.get('scale',1) not in (1,2):
            raise ValueError('Unknown sprite scale: '+key)
    return dict(schemaVersion=1, packs=len(manifest['packs']),pages=len(pages),
                regions=len(manifest['regions']),sourceBytes=total,
                atlasSha256=hashlib.sha256((root/'atlas.json').read_bytes()).hexdigest(),
                scope='Imported PNG hashes, dimensions, region bounds and anchors; not visual or semantic acceptance')


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',type=Path,default=ROOT)
    args=parser.parse_args()
    print(json.dumps(check(args.root),indent=2))
