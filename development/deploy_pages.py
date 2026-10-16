"""Build Pages; optionally include the user-authorized converted game assets."""
import argparse
from pathlib import Path
import shutil
import hashlib
import re
from compress_png import compress_png
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--include-assets',action='store_true');args=p.parse_args()
source=Path(__file__).resolve().parent;out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
if not args.include_assets and ((out/'private-assets').exists() or (out/'hosted-assets.json').exists()):
    raise SystemExit('This output already includes hosted assets; use --include-assets or a fresh code-only directory')
for name in ['src','vendor','assets']:
    if (out/name).exists():shutil.rmtree(out/name)
shutil.copytree(source/'src',out/'src')
# Canonical volume deliveries and recipe-backed raster pages are runtime dependencies.
shutil.copytree(source/'assets',out/'assets')
for name in ['style.css','portfolio.css','workshop.css','menu.css','asset-worker.js']:shutil.copy2(source/name,out/name)
(out/'index.html').write_text((source/'index.html').read_text().replace('./node_modules/three/build/three.module.js','./vendor/three/three.module.js').replace('./node_modules/hls.js/dist/hls.mjs','./vendor/hls/hls.mjs'))
# Content-derived versioning prevents old cached modules/styles mixing with a new release.
version=hashlib.sha256(b''.join(f.read_bytes() for f in sorted((source/'src').glob('*.js')))+(source/'style.css').read_bytes()+(source/'portfolio.css').read_bytes()+(source/'workshop.css').read_bytes()+(source/'menu.css').read_bytes()+b''.join((source/'private-assets'/name).read_bytes() for name in ['original-interiors.png','original-house-details.png','original-cafe.png','original-architecture.png','original-masonry.png'])).hexdigest()[:12]
for file in (out/'src').glob('*.js'):
    code=file.read_text()
    code=re.sub(r"(['\"])(\./[^'\"?]+\.js)\1",lambda m:m[1]+m[2]+'?v='+version+m[1],code)
    file.write_text(code)
index=(out/'index.html').read_text()
for name in ['style.css','portfolio.css','workshop.css','menu.css','src/bootstrap.js']:
    index=index.replace('"'+name+'"','"'+name+'?v='+version+'"')
(out/'index.html').write_text(index)
(out/'.nojekyll').touch();vendor=out/'vendor/three';vendor.mkdir(parents=True)
for name in ['three.module.js','three.core.js']:shutil.copy2(source/'node_modules/three/build'/name,vendor/name)
shutil.copy2(source/'node_modules/three/LICENSE',vendor/'LICENSE')
(out/'vendor/hls').mkdir(parents=True)
shutil.copy2(source/'node_modules/hls.js/dist/hls.mjs',out/'vendor/hls/hls.mjs')
shutil.copy2(source/'node_modules/hls.js/LICENSE',out/'vendor/hls/LICENSE')
# Original project art ships with code-only releases too.
(out/'private-assets').mkdir(exist_ok=True)
for art in ['original-interiors.png','original-house-details.png','original-cafe.png','original-architecture.png','original-masonry.png']:
    shutil.copy2(source/'private-assets'/art,out/'private-assets'/art)
print(f'Static site code written to {out}')

if args.include_assets:
    # Explicit publication option; only converted runtime formats, never saves or research.
    import json
    asset_out=out/'private-assets'
    for file in (source/'private-assets').rglob('*'):
        if not file.is_file():continue
        if file.suffix not in {'.json','.png','.wav','.webp'} and not file.name.endswith('.json.gz'):raise ValueError(f'Unexpected runtime asset: {file.name}')
        target=asset_out/file.relative_to(source/'private-assets');target.parent.mkdir(parents=True,exist_ok=True)
        if file.suffix=='.json':
            def clean(value):
                if isinstance(value,dict):return {k:clean(v) for k,v in value.items()}
                if isinstance(value,list):return [clean(v) for v in value]
                if isinstance(value,str) and value.startswith('/Users/'):return '<local-source>/'+Path(value).name
                return value
            target.write_text(json.dumps(clean(json.loads(file.read_text())),ensure_ascii=False,separators=(',',':')))
        elif file.suffix=='.png':target.write_bytes(compress_png(file.read_bytes()))
        else:shutil.copy2(file,target)
    (out/'hosted-assets.json').write_text('{"available":true}\n')
    print('Included converted runtime assets; excluded saves, recordings and source binaries')
