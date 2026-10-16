"""Decode installed PZ texture packs for LOCAL research; no source assets are committed.

Pack framing was inspected in the installed TexturePackDevice.readPage bytecode.
Only image pages + region metadata are extracted; no game code is copied.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import tempfile
import fcntl


class Reader:
    def __init__(self, data):
        self.data, self.pos = data, 0

    def take(self, count):
        if count < 0 or self.pos + count > len(self.data):
            raise ValueError("Truncated/invalid pack")
        value = self.data[self.pos:self.pos + count]
        self.pos += count
        return value

    def integer(self):
        return struct.unpack('<i', self.take(4))[0]

    def string(self):
        length = self.integer()
        if not 0 <= length <= 16384:
            raise ValueError('Invalid string length')
        return self.take(length).decode('utf-8')


def unpack(path, output):
    data = path.read_bytes()
    r = Reader(data)
    version = 0
    if data[:4] == b'PZPK':
        r.take(4)
        version = r.integer()
        if version != 1:
            raise ValueError(f'Unsupported pack version {version}')
    count = r.integer()
    if not 0 < count < 10000:
        raise ValueError('Invalid page count')
    regions, pages, overrides = {}, [], []
    for page_index in range(count):
        name, n, alpha = r.string(), r.integer(), r.integer()
        if not 0 <= n < 100000:
            raise ValueError('Invalid region count')
        page = f'{path.stem}-{page_index}.png'
        page_regions = []
        for _ in range(n):
            key = r.string()
            if key in regions:
                overrides.append(dict(id=key,previousPage=regions[key]['page'],selectedPage=page))
            values = [r.integer() for _ in range(8)]
            regions[key] = dict(zip(['x', 'y', 'w', 'h', 'ox', 'oy', 'ow', 'oh'], values), page=page)
            page_regions.append(regions[key])
        if version:
            png = r.take(r.integer())
        else:
            start = r.pos
            if r.take(8) != b'\x89PNG\r\n\x1a\n':
                raise ValueError('Expected PNG signature')
            while True:
                size = struct.unpack('>I', r.take(4))[0]
                kind = r.take(4)
                r.take(size + 4)
                if kind == b'IEND':
                    break
            png = data[start:r.pos]
            if r.take(4) != b'\xef\xbe\xad\xde':
                raise ValueError('Invalid legacy end marker')
        if not png.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError('Non-PNG texture page')
        if len(png) < 24 or png[12:16] != b'IHDR': raise ValueError('Invalid PNG header')
        width, height = struct.unpack('>II', png[16:24])
        for reg in page_regions:
            if min(reg['x'], reg['y'], reg['w'], reg['h']) < 0 or reg['x'] + reg['w'] > width or reg['y'] + reg['h'] > height:
                raise ValueError('Region exceeds atlas')
        (output / page).write_bytes(png)
        pages.append(dict(file=page, name=name, width=width, height=height, alpha=bool(alpha), sha256=hashlib.sha256(png).hexdigest()))
    if r.pos != len(data):
        raise ValueError(f'{len(data) - r.pos} unread bytes')
    return regions, dict(file=path.name, sha256=hashlib.sha256(data).hexdigest(), pages=pages, overrides=overrides)


PACK_NAMES = ['Tiles1x.floor', 'Tiles1x', 'JumboTrees1x', 'UI', 'Tiles2x.floor', 'Tiles2x', 'JumboTrees2x', 'JumboTreesBigs2x', 'UI2', 'Overlays2x.floor']


def import_library(source, output, names=PACK_NAMES):
    """Publish a complete new directory only; never modify an existing library."""
    output = Path(output).resolve()
    media = Path(source) / 'Project Zomboid.app/Contents/Java/media'
    lock_name = 'tian-import-'+hashlib.sha256(str(output).encode()).hexdigest()[:20]+'.lock'
    with (Path(tempfile.gettempdir())/lock_name).open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if output.exists(): raise FileExistsError('Output already exists; preserve it and select a new --output')
        output.parent.mkdir(parents=True, exist_ok=True)
        # Same filesystem ensures the final directory rename is atomic for readers.
        with tempfile.TemporaryDirectory(prefix='.'+output.name+'-stage-', dir=output.parent) as temporary:
            stage = Path(temporary)/'library'; stage.mkdir()
            regions, packs, overrides = {}, [], []
            for name in names:
                entries, metadata = unpack(media / 'texturepacks' / f'{name}.pack', stage)
                if '2x' in name:
                    for entry in entries.values(): entry['scale'] = 2
                # Pack order intentionally gives later high-resolution pages priority.
                for key in entries.keys() & regions.keys():
                    overrides.append(dict(id=key, previousPage=regions[key]['page'], selectedPage=entries[key]['page']))
                regions.update(entries); packs.append(metadata)
            manifest = dict(schema_version=1, usage='local-installed-assets', redistribution=False,
                            packs=packs, regions=regions, overrides=sorted(overrides,key=lambda r:(r['id'],r['selectedPage'])),
                            recipe=dict(id='installed-pz-texture-packs',version=1,sourceKind='raster-import',
                                        packOrder=list(names),selection='last-pack-wins',
                                        generatorSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()))
            (stage/'atlas.json').write_text(json.dumps(manifest))
            if output.exists(): raise FileExistsError('Output appeared during import; refusing replacement')
            stage.rename(output)
            return manifest


def supplement_library(source, output, names):
    """Add previously absent packs; publish new pages before switching the manifest."""
    output=Path(output).resolve()
    if not names or len(set(names))!=len(names):raise ValueError('Choose distinct supplemental packs')
    if any(Path(n).name!=n or n in ('.','..') for n in names):raise ValueError('Invalid pack name')
    lock_name='tian-import-'+hashlib.sha256(str(output).encode()).hexdigest()[:20]+'.lock'
    with (Path(tempfile.gettempdir())/lock_name).open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        manifest=json.loads((output/'atlas.json').read_text())
        existing={p['file'] for p in manifest['packs']}
        if any(n+'.pack' in existing for n in names):raise ValueError('Pack already imported')
        with tempfile.TemporaryDirectory(prefix='.tian-supplement-',dir=output.parent) as temporary:
            stage=Path(temporary)
            additions=[]
            for name in names:
                entries,metadata=unpack(Path(source)/'Project Zomboid.app/Contents/Java/media/texturepacks'/f'{name}.pack',stage)
                if '2x' in name:
                    for entry in entries.values():entry['scale']=2
                overlap=set(entries)&set(manifest['regions'])
                if overlap:raise ValueError('Supplement must not replace existing sprites: '+', '.join(sorted(overlap)[:5]))
                for page in metadata['pages']:
                    if (output/page['file']).exists():raise ValueError('Supplement page already exists: '+page['file'])
                    additions.append(page['file'])
                manifest['regions'].update(entries);manifest['packs'].append(metadata)
            manifest.setdefault('supplementRecipes',[]).append(dict(version=1,sourceKind='raster-import',packOrder=list(names),selection='new-ids-only',generatorSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()))
            (stage/'atlas.json').write_text(json.dumps(manifest))
            # All old referenced pages stay intact. Interrupted publication can leave only
            # unreferenced additions; it cannot point the manifest at a missing new page.
            published=[]
            try:
                for page in additions:
                    (stage/page).rename(output/page);published.append(output/page)
                (stage/'atlas.json').replace(output/'atlas.json')
            except BaseException:
                for page in published:page.unlink(missing_ok=True)
                raise
            return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'private-assets')
    parser.add_argument('--add-pack',action='append',default=[],help='Add an absent pack to an existing library without replacing sprite IDs')
    args = parser.parse_args()
    manifest = supplement_library(args.source,args.output,args.add_pack) if args.add_pack else import_library(args.source, args.output)
    print(json.dumps(dict(packs=len(manifest['packs']), pages=sum(len(p['pages']) for p in manifest['packs']), regions=len(manifest['regions']))))


if __name__ == '__main__':
    main()
