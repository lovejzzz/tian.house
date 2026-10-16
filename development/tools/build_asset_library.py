"""Recipe -> exact-lossless atlas -> semantic catalogue. Requires Pillow with WebP."""
from pathlib import Path
import argparse, hashlib, io, json, re, subprocess, sys, tempfile, shutil, os, fcntl
from PIL import Image, __version__ as pillow_version, features
ROOT = Path(__file__).resolve().parents[1]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def encode_exact(source):
    original = Image.open(io.BytesIO(source)).convert('RGBA')
    out = io.BytesIO()
    original.save(out, 'WEBP', lossless=True, exact=True, method=6)
    candidate = out.getvalue()
    decoded = Image.open(io.BytesIO(candidate)).convert('RGBA')
    if decoded.size != original.size or decoded.tobytes() != original.tobytes():
        raise ValueError('Lossless encoding changed pixels (including transparent RGB)')
    return candidate, original

STATE_FIELDS = [('OpenTileOffset', 'open'), ('SmashedTileOffset', 'broken'), ('GlassRemovedOffset', 'glass-removed')]

def state_index(properties, regions=None):
    """Resolve links once, and reject ambiguous/dangling states before publication."""
    index = {}
    for base, props in properties.items():
        stem, _, number = base.rpartition('_')
        for field, state in STATE_FIELDS:
            if field not in props: continue
            if not number.isdigit(): raise ValueError('State source has no numeric suffix: '+base)
            try: offset = int(props[field])
            except (TypeError, ValueError): raise ValueError('Invalid state offset: '+base+' '+field)
            target = stem+'_'+str(int(number)+offset)
            if target == base: raise ValueError('Self-referencing state: '+base+' '+field)
            if regions is not None and target not in regions:
                raise ValueError('Missing state sprite: '+base+' '+field+' -> '+target)
            if target in index: raise ValueError('Ambiguous state sprite: '+target)
            index[target] = (props, state)
    return index

def validate_ground_profiles(properties):
    """Reject invalid shared ground geometry before publishing runtime modules."""
    for tile, props in properties.items():
        profile=props.get('TianGroundPolygon')
        base=props.get('TianGroundBase')
        if base is not None:
            target=properties.get(base,{}) if isinstance(base,str) else {}
            if base==tile or 'solidfloor' not in target or any(k in target for k in ['FloorOverlay','TianGroundPolygon','TianGroundBase']) or target.get('MoveType')=='FloorRug' or str(target.get('TianGroundHeight','0'))!='0':
                raise ValueError('Invalid ground base: '+tile)
        if profile is None: continue
        try:
            poly=json.loads(profile)
            valid=isinstance(poly,list) and 3<=len(poly)<=8 and all(isinstance(p,list) and len(p)==2 and all(type(v) in (int,float) and 0<=v<=1 for v in p) for p in poly)
            if not valid: raise ValueError()
            if len({tuple(p) for p in poly})!=len(poly): raise ValueError()
            area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1]))/2
            if area<=1e-9: raise ValueError()
            for a,b in zip(poly,poly[1:]+poly[:1]):
                if any((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]) < -1e-9 for p in poly): raise ValueError()
            if 'solidfloor' not in props or 'FloorOverlay' in props or not 0<float(props.get('TianGroundHeight',0))<=16: raise ValueError()
        except (TypeError,ValueError,OverflowError):
            raise ValueError('Invalid ground polygon: '+tile) from None

def validate_config(config):
    if config.get('schemaVersion') != 1: raise ValueError('Unknown recipe schema')
    seen = {key:set() for key in ['id', 'module', 'page', 'generator']}
    for recipe in config['recipes']:
        for field in ['id','version','sourceKind','generator','module','page','parameters','provenance','tags','material']:
            if field not in recipe: raise ValueError('Missing recipe field: '+field)
        for key, values in seen.items():
            value = recipe[key]
            if value in values: raise ValueError('Duplicate recipe '+key+': '+value)
            values.add(value)
        for key in ['generator', 'module', 'page']:
            path = Path(recipe[key])
            if path.is_absolute() or '..' in path.parts:
                raise ValueError('Recipe paths must stay inside the asset project')
        if Path(recipe['page']).name != recipe['page']:
            raise ValueError('Atlas page must be a filename')
        if recipe.get('delivery','smallest-exact') not in ['png','smallest-exact']:
            raise ValueError('Unknown delivery policy: '+str(recipe['delivery']))
        if recipe['parameters']: raise ValueError('This generator has no external parameter contract yet')
        for value in recipe.get('sourceFiles', []):
            if not isinstance(value,str) or Path(value).is_absolute() or '..' in Path(value).parts: raise ValueError('Recipe source paths must stay inside the asset project')

def semantic(tile, region, props, recipe, properties, states=None):
    p = props
    if recipe['id'] == 'cafe' and tile.startswith('tian_cafe_service_door_'):
        p = properties.get('tian_cafe_service_door_'+str(int(tile.rsplit('_',1)[1]) % 2),props)
    state = 'default'
    # Indexed once per atlas rather than scanning every property for every region.
    inherited = (state_index(properties) if states is None else states).get(tile)
    if inherited is not None: p, state = inherited
    if state == 'default' and any(k in p for k in ['doorN','doorW','windowN','windowW']):
        state = 'open' if props.get('TianDerivedAsset') == 'true' else 'closed'
    if recipe['id'] == 'cafe' and tile.startswith('tian_cafe_service_door_'):
        state = 'open' if int(tile.rsplit('_',1)[1]) >= 2 else 'closed'
    kind = ('guard' if p.get('TianGuard') == 'true' else 'wall' if 'wall' in p else 'door' if any(k in p for k in ['doorN','doorW']) else
            'window' if any(k in p for k in ['windowN','windowW']) else
            'rug' if 'FloorOverlay' in p else 'stairs' if 'TianReturnStair' in p else
            'floor' if 'solidfloor' in p else 'furnishing')
    family = p.get('TianVariantFamily') or re.sub(r'_[NWES](?=_|$)|_w(?=_|$)', '', re.sub(r'_\d+$','',tile))
    return dict(id=tile,name=p.get('CustomName',tile),family=family,kind=kind,
                direction=p.get('Facing'),state=state,material=p.get('TianMaterial',recipe['material']),
                tags=recipe['tags'],support='adjacent-floor-edge' if kind == 'guard' else p.get('TianMount'),part=p.get('SpriteGridPos'),
                sourceProperties=props,region=region,recipe=recipe['id'],
                provenance=recipe['provenance'],semanticEvidence='generator-properties',
                # Null means unspecified, never an invented material or dimension.
                pixelDimensions=[region['w'],region['h']])

def _build_staged(root, regenerate=False):
    config=json.loads((root/'assets/recipes/originals.json').read_text())
    validate_config(config)
    pages=[]; entries=[]; staged=[]; seen=set()
    registered={r['page'] for r in config['recipes']}
    missing={p.name for p in (root/'private-assets').glob('original-*.png')}-registered
    if missing: raise ValueError('Unregistered original atlas recipes: '+', '.join(sorted(missing)))
    for recipe in config['recipes']:
        for required in ['id','version','sourceKind','generator','module','page','parameters','provenance','tags','material']:
            if required not in recipe: raise ValueError('Missing recipe field: '+required)
        if recipe['parameters']: raise ValueError('This generator has no external parameter contract yet')
        if regenerate:
            subprocess.run([sys.executable,str(root/recipe['generator'])],cwd=root,check=True)
        path=root/recipe['module']; text=path.read_text()
        match=re.search(r'const (?:data|assets)\s*=\s*(\{.*?\});',text,re.S)
        if not match: raise ValueError('Missing generated asset data: '+str(path))
        data=json.loads(match[1]); source=(root/'private-assets'/recipe['page']).read_bytes()
        if recipe.get('delivery') == 'png':
            original=Image.open(io.BytesIO(source)).convert('RGBA');candidate=None
        else:
            candidate,original=encode_exact(source)
        use_webp=candidate is not None and len(candidate)<len(source)
        page=Path(recipe['page']).with_suffix('.webp').name if use_webp else recipe['page']
        runtime=candidate if use_webp else source
        orphaned=set(data['properties'])-set(data['regions'])
        if orphaned: raise ValueError('Properties without sprite: '+', '.join(sorted(orphaned)))
        states=state_index(data['properties'],data['regions'])
        validate_ground_profiles(data['properties'])
        for tile,region in data['regions'].items():
            if tile in seen: raise ValueError('Duplicate stable ID: '+tile)
            seen.add(tile)
            if region['x']<0 or region['y']<0 or region['w']<=0 or region['h']<=0 or region['x']+region['w']>original.width or region['y']+region['h']>original.height:
                raise ValueError('Out-of-bounds atlas region: '+tile)
            region['page']=page
            entry=semantic(tile,region,data['properties'].get(tile,{}),recipe,data['properties'],states)
            entries.append(entry)
            if tile in data['properties']:
                data['properties'][tile]['TianRecipe']=recipe['id']
                data['properties'][tile]['TianSemanticTags']=' '.join([entry['kind'],entry['state'],*entry['tags']])
        payload=json.dumps(data,separators=(',',':'))
        staged.append((path,text[:match.start(1)]+payload+text[match.end(1):]))
        if use_webp: staged.append((root/'private-assets'/page,runtime))
        pages.append(dict(recipe=recipe['id'],source=recipe['page'],runtime=page,
                          sourceBytes=len(source),runtimeBytes=len(runtime),sourceSha256=digest(source),
                          runtimeSha256=digest(runtime),rgbaSha256=digest(original.tobytes()),
                          size=list(original.size),generatorSha256=digest((root/recipe['generator']).read_bytes()),sourceHashes={p:digest((root/p).read_bytes()) for p in recipe.get('sourceFiles', [])}))
    catalogue=dict(schemaVersion=1,assets=entries)
    report=dict(schemaVersion=1,pillow=pillow_version,webp=features.version('webp'),pages=pages,
                sourceBytes=sum(p['sourceBytes'] for p in pages),runtimeBytes=sum(p['runtimeBytes'] for p in pages))
    # Validate every page before replacing references. No live browser reload is triggered.
    for path,content in sorted(staged,key=lambda item:isinstance(item[1],str)):
        path.parent.mkdir(parents=True,exist_ok=True)
        tmp=path.with_suffix(path.suffix+'.tmp')
        tmp.write_bytes(content if isinstance(content,bytes) else content.encode());tmp.replace(path)
    for name,content in [('semantic-catalog.json',catalogue),('asset-build-report.json',report)]:
        path=root/'private-assets'/name;tmp=path.with_suffix('.tmp')
        tmp.write_text(json.dumps(content,indent=2)+'\n');tmp.replace(path)
    return report

def build(root=ROOT, regenerate=False, check=False):
    root=Path(root).resolve()
    # Serialize builds, without touching an in-progress user's browser session.
    lock_path=Path(tempfile.gettempdir())/('tian-assets-'+digest(str(root).encode())[:20]+'.lock')
    with lock_path.open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        report=build_isolated(root,regenerate or check,check=check)
        print(json.dumps(report,indent=2))
        return report

def build_isolated(root,regenerate,check=False):
    config=json.loads((root/'assets/recipes/originals.json').read_text())
    validate_config(config)
    def relative(value):
        p=Path(value)
        if p.is_absolute() or '..' in p.parts: raise ValueError('Recipe paths must stay inside the asset project')
        return p
    recipes=config['recipes']
    registered={r['page'] for r in recipes}
    missing={p.name for p in (root/'private-assets').glob('original-*.png')}-registered
    if missing: raise ValueError('Unregistered original atlas recipes: '+', '.join(sorted(missing)))
    with tempfile.TemporaryDirectory(prefix='tian-assets-stage-') as temporary:
        stage=Path(temporary)
        inputs={Path('assets/recipes/originals.json')}
        for r in recipes:
            inputs.update([relative(r['generator']),relative(r['module']),Path('private-assets')/relative(r['page'])])
            inputs.update(relative(p) for p in r.get('sourceFiles', []))
        for rel in inputs:
            dest=stage/rel;dest.parent.mkdir(parents=True,exist_ok=True)
            source=root/rel
            if source.exists(): shutil.copyfile(source,dest)
        # Generators and all downstream validators write only inside this stage.
        report=_build_staged(stage,regenerate)
        outputs=[]
        for r,p in zip(recipes,report['pages']):
            outputs.extend([Path('private-assets')/r['page'],Path('private-assets')/p['runtime']])
        outputs.extend(relative(r['module']) for r in recipes)
        outputs.extend(Path('private-assets')/name for name in ['semantic-catalog.json','asset-build-report.json'])
        outputs=list(dict.fromkeys(outputs))
        originals={rel:(root/rel).read_bytes() if (root/rel).exists() else None for rel in outputs}
        if check:
            outdated=[str(rel) for rel in outputs if originals[rel]!=(stage/rel).read_bytes()]
            if outdated: raise ValueError('Generated assets are stale; run the canonical build: '+', '.join(outdated))
            return report
        changed=[]
        try:
            for rel in outputs:
                destination=root/rel;destination.parent.mkdir(parents=True,exist_ok=True)
                payload=(stage/rel).read_bytes()
                if payload==originals[rel]: continue
                tmp=destination.with_name(destination.name+'.build-tmp')
                try:
                    tmp.write_bytes(payload);os.replace(tmp,destination)
                finally:
                    tmp.unlink(missing_ok=True)
                changed.append(rel)
        except BaseException:
            # Roll back ordinary publication failures. A process/machine crash
            # still needs versioned-directory publication, not this file loop.
            for rel in reversed(changed):
                destination=root/rel
                if originals[rel] is None: destination.unlink(missing_ok=True)
                else: destination.write_bytes(originals[rel])
            raise
        return report

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--regenerate',action='store_true');ap.add_argument('--check',action='store_true',help='Regenerate in isolation and fail if published outputs differ; never write outputs');args=ap.parse_args()
    build(regenerate=args.regenerate,check=args.check)
