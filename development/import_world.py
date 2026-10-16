"""Read the installed B42 LOTP/LOTH map into local, streamed browser cells.

No source runtime fidelity claim: this is a static format adapter. Retain all
levels and tile ordering; runtime collision comes from tile definition flags.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct


def header(path):
    data = path.read_bytes()
    if data[:8] != b'LOTH\x01\x00\x00\x00':
        raise ValueError('Only installed B42 LOTH v1 is supported')
    count = struct.unpack_from('<i', data, 8)[0]
    pos, names = 12, []
    for _ in range(count):
        end = data.index(b'\n', pos)
        names.append(data[pos:end].decode().rstrip('\r'))
        pos = end + 1
    width, height, low, high = struct.unpack_from('<4i', data, pos)
    if (width, height) != (8, 8) or not -32 <= low <= high <= 31:
        raise ValueError('Unsupported map dimensions')
    return names, low, high


def decode_cell(path, names, low, high):
    data = path.read_bytes()
    if data[:8] != b'LOTP\x01\x00\x00\x00':
        raise ValueError('Only installed B42 LOTP v1 is supported')
    rows = []
    for cx in range(32):
        for cy in range(32):
            pos = struct.unpack_from('<i', data, 12 + (cx * 32 + cy) * 8)[0]
            if not 8204 <= pos < len(data):
                raise ValueError('Invalid chunk offset')
            skip = 0
            for z in range(low, high + 1):
                for x in range(8):
                    for y in range(8):
                        if skip:
                            skip -= 1
                            continue
                        n = struct.unpack_from('<i', data, pos)[0]
                        pos += 4
                        if n == -1:
                            skip = struct.unpack_from('<i', data, pos)[0] - 1
                            pos += 4
                            if skip < 0:
                                raise ValueError('Invalid empty run')
                        elif n > 1:
                            if n > 100:
                                raise ValueError('Invalid tile stack')
                            vals = struct.unpack_from(f'<{n}i', data, pos)
                            pos += n * 4
                            if any(not 0 <= t < len(names) for t in vals[1:]):
                                raise ValueError('Invalid tile index')
                            rows.append([cx * 8 + x, cy * 8 + y, z, vals[0], *vals[1:]])
    return rows


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--output', type=Path, default=Path(__file__).parent / 'private-assets/world')
    a = p.parse_args()
    media = a.source / 'Project Zomboid.app/Contents/Java/media'
    if a.output.exists():
        raise SystemExit('Output exists; preserve it and choose a new --output')
    a.output.mkdir(parents=True)
    props = {}
    definition = media / 'newtiledefinitions.tiles.txt'
    for name, body in re.findall(r'// ([\w]+)\s+tile\s*\{([^}]+)\}', definition.read_text()):
        props[name] = {k.strip(): v.strip() for k,v in re.findall(r'^\s*([\w]+) =([^\n]*)', body, re.M) if k.strip() != 'xy'}
    (a.output / 'properties.json').write_text(json.dumps(props, separators=(',', ':')))
    cells = []
    for cx in range(30, 35):
        for cy in range(43, 50):
            folder = media / 'maps/Muldraugh, KY'
            h, lot = folder / f'{cx}_{cy}.lotheader', folder / f'world_{cx}_{cy}.lotpack'
            if not h.exists() or not lot.exists():
                continue
            names, low, high = header(h)
            rows = decode_cell(lot, names, low, high)
            result = dict(x=cx, y=cy, names=names, low=low, high=high, squares=rows)
            (a.output / f'{cx}_{cy}.json').write_text(json.dumps(result, separators=(',', ':')))
            cells.append(dict(x=cx,y=cy,squares=len(rows),header_sha256=hashlib.sha256(h.read_bytes()).hexdigest(),lot_sha256=hashlib.sha256(lot.read_bytes()).hexdigest()))
    manifest = dict(schema_version=1, name='Rosewood, KY', source_build='Steam 25485521', bounds=[7680,11008,8960,12800], spawn=[7976.5,11402.5,0], cells=cells, tile_properties_sha256=hashlib.sha256(definition.read_bytes()).hexdigest())
    (a.output / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    print(json.dumps(dict(cells=len(cells),squares=sum(c['squares'] for c in cells),tile_definitions=len(props))))


if __name__ == '__main__':
    main()
