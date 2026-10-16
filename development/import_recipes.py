"""Inventory private native craft declarations without pretending to execute them.

Keep every declaration, including entity components and conflicting definitions.
Filesystem order is not native ScriptManager load order.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from import_items import parse, properties


def collect(root):
    declarations, inputs = [], []
    for file in sorted(root.rglob('*.txt')):
        raw = file.read_bytes()
        source = raw.decode('utf-8-sig')
        if not re.search(r'\b(?:craftRecipe\s+\w+|component\s+CraftRecipe)\s*\{', source):
            continue
        tree = parse(source)
        relative = file.relative_to(root).as_posix()
        inputs.append({'path': relative, 'sha256': hashlib.sha256(raw).hexdigest()})
        def visit(node, ancestry):
            header = node.get('header', '')
            path = ancestry + ([header] if header else [])
            if header.startswith('craftRecipe ') or header == 'component CraftRecipe':
                declarations.append({'kind': 'named' if header.startswith('craftRecipe ') else 'entity-component',
                                     'source': relative, 'path': path, 'properties': properties(node),
                                     'values': node['values'], 'children': node['children']})
            for child in node['children']:
                visit(child, path)
        visit(tree, [])
    return {'schema_version': 1, 'kind': 'source-static', 'redistribution': False,
            'declarations': declarations, 'inputs': inputs,
            'limitation': 'Unresolved declarations, not a native loaded registry. Includes entity recipe components. Does not implement parsing of inputs, inheritance, load order, Lua callbacks or crafting behavior.'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', required=True, type=Path)
    ap.add_argument('--output', required=True, type=Path)
    args = ap.parse_args()
    if args.output.exists():
        raise SystemExit('Output exists; choose a new snapshot path')
    root = args.source/'Project Zomboid.app/Contents/Java/media/scripts'
    payload = collect(root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x') as out:
        json.dump(payload, out, ensure_ascii=False, separators=(',', ':'))
    print(json.dumps({'declarations': len(payload['declarations']), 'files': len(payload['inputs']),
                      'named': sum(d['kind']=='named' for d in payload['declarations']),
                      'components': sum(d['kind']=='entity-component' for d in payload['declarations'])}))

if __name__ == '__main__':
    main()
