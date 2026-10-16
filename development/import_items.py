"""Import local PZ script item definitions, retaining nested components and provenance.

This reads declarative data, not executable Lua. Unknown properties are retained;
parsing a definition does not mean its behavior has been implemented.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path


def tokens(source):
    pattern = r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|[{},=]|[^\s{},=]+'
    return [m.group() for m in re.finditer(pattern, source) if not m.group().startswith(('//', '/*'))]


def parse(source):
    ts = tokens(source)
    def block(pos, nested=False):
        children, values, head = [], [], []
        while pos < len(ts):
            t = ts[pos]; pos += 1
            if t == '{':
                if not head: raise ValueError('Block without declaration')
                node, pos = block(pos, True)
                node['header'] = ' '.join(head); children.append(node); head = []
            elif t == '}':
                if not nested: raise ValueError('Unexpected closing brace')
                if head: values.append(' '.join(head))
                return {'children':children, 'values':values}, pos
            elif t == ',':
                if head: values.append(' '.join(head)); head = []
            else: head.append(t)
        if nested: raise ValueError('Unclosed script block')
        if head: values.append(' '.join(head))
        return {'children':children, 'values':values}, pos
    return block(0)[0]


def properties(node):
    result = {}
    for row in node['values']:
        if '=' not in row: continue
        k,v = row.split('=',1); k,v = k.strip(),v.strip()
        if v.lower() in ('true','false'): v = v.lower() == 'true'
        else:
            try: v = float(v) if '.' in v else int(v)
            except ValueError: v = v.strip('"')
        result[k] = v
    return result


def collect(root, translations):
    items, inputs, duplicates = {}, [], []
    for file in sorted(root.rglob('*.txt')):
        source = file.read_text(encoding='utf-8-sig')
        # Other script languages in this directory need not be parsed as items.
        if not re.search(r'\bitem\s+\w+\s*\{', source): continue
        tree = parse(source)
        inputs.append({'path':str(file.relative_to(root)), 'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
        for module in tree['children']:
            if not module['header'].startswith('module '): continue
            prefix = module['header'].split()[1]
            for item in module['children']:
                if not item['header'].startswith('item '): continue
                full = prefix+'.'+item['header'].split()[1]
                previous = items.get(full)
                items[full] = {'type':full, 'name':translations.get(full,full), 'properties':properties(item),
                               'components':item['children'], 'source':str(file.relative_to(root))}
                if previous:
                    identical = previous['properties'] == items[full]['properties'] and previous['components'] == items[full]['components']
                    duplicates.append({'type':full,'identical':identical,'previous':previous})
                    if not identical: items[full]['unresolved_override'] = True
    return items, inputs, duplicates


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--source',required=True,type=Path)
    ap.add_argument('--output',type=Path,default=Path(__file__).parent/'private-assets/items.json');args=ap.parse_args()
    if args.output.exists(): raise SystemExit('Output exists; choose a new snapshot path')
    media=args.source/'Project Zomboid.app/Contents/Java/media'
    translations={}
    for lang in ['EN']:
        translations.update(json.loads((media/f'lua/shared/Translate/{lang}/ItemName.json').read_text()))
    items,inputs,duplicates=collect(media/'scripts',translations)
    payload={'schema_version':1,'kind':'source-static','redistribution':False,'items':items,'inputs':inputs,'duplicates':duplicates,
             'limitation':'Declarative catalog only. Runtime behavior requires separate implementation and validation.'}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    with args.output.open('x') as f:json.dump(payload,f,ensure_ascii=False,separators=(',',':'))
    print(json.dumps({'items':len(items),'inputs':len(inputs),'duplicates':len(duplicates),'unresolved':sum(not d['identical'] for d in duplicates),'output':str(args.output)}))

if __name__=='__main__':main()
