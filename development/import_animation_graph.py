"""Preserve installed player animation definitions for implementation research.

No runtime state-selection, playback-rate or source-game parity claim is implied.
Repeated XML elements and attributes retain order; conflicting asset candidates
are reported instead of silently choosing a load precedence.
"""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


def element_data(element):
    return {'tag': element.tag, 'attributes': dict(element.attrib),
            'text': (element.text or '').strip(),
            'children': [element_data(child) for child in element]}


def read_node(path):
    root = ET.fromstring(path.read_bytes())
    if root.tag != 'animNode' or not root.findtext('m_Name'):
        raise ValueError(f'Invalid animation node: {path.name}')
    return {'name': root.findtext('m_Name'), 'definition': element_data(root),
            'clips': sorted({e.text.strip() for e in root.iter('m_AnimName') if e.text and e.text.strip()}),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit('Output exists; preserve previous evidence and use a new output')
    media = args.source / 'Project Zomboid.app/Contents/Java/media'
    nodes = {str(p.relative_to(media/'AnimSets/player')): read_node(p)
             for p in sorted((media/'AnimSets/player').rglob('*.xml'))}
    if not nodes:
        raise SystemExit('No player animation nodes found')
    assets = {}
    for directory in ['anims_X', 'anims']:
        for path in sorted((media/directory).rglob('*')):
            if path.is_file() and path.suffix.lower() in {'.x', '.fbx', '.txt'}:
                assets.setdefault(path.stem.casefold(), []).append(str(path.relative_to(media)))
    clips = sorted({clip for node in nodes.values() for clip in node['clips']})
    references = {clip: assets.get(clip.casefold(), []) for clip in clips}
    result = {'schema_version': 1, 'kind': 'source-static-discovery', 'nodes': nodes,
              'clip_candidates': references,
              'unresolved': [clip for clip, paths in references.items() if not paths],
              'ambiguous': {clip: paths for clip, paths in references.items() if len(paths)>1},
              'limitations': ['File presence is not runtime activation',
                             'Animation set inheritance and asset loading precedence require runtime investigation',
                             'Raw clip duration differs from effective graph playback timing']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x') as stream:
        json.dump(result, stream, ensure_ascii=False, separators=(',', ':'))
    print(json.dumps({'nodes': len(nodes), 'clips': len(clips),
                      'unresolved': len(result['unresolved']), 'ambiguous': len(result['ambiguous'])}))


if __name__ == '__main__':
    main()
