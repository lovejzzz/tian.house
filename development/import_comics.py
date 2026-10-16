"""Build a private comic catalog from native registry probe and installed translations."""
import argparse,csv,hashlib,json
from pathlib import Path

def build(registry,media):
    source=media/'lua/shared/Translate/EN/IG_UI.json'
    texts=json.loads(source.read_text())
    entries=[]
    for row in csv.DictReader(registry.open(),delimiter='\t'):
        entries.append(dict(key=row['key'],issues=int(row['issues']),inPrint=row['inPrint']=='true',title=texts[row['key']]))
    if not entries or len({e['key'] for e in entries})!=len(entries):raise ValueError('Empty or duplicate comic registry')
    return dict(schema_version=1,entries=entries,formats={k:texts[k] for k in ['IGUI_MagazineName','IGUI_MagazineNameNoIssue']},sources=[dict(path=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in [registry,source]])
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--registry',type=Path,required=True);ap.add_argument('--media',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);a=ap.parse_args()
    a.output.write_text(json.dumps(build(a.registry,a.media),ensure_ascii=False,separators=(',',':')))
