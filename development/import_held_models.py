"""Import selected installed static hand models; private assets remain local."""
import argparse,hashlib,json,re,shutil,subprocess
from pathlib import Path
from import_characters import blocks,mesh_file,nums

def properties(body):
    # Attachment blocks are parsed separately; top-level fields must not inherit theirs.
    for _,_,start,end in reversed(list(blocks(body,'attachment'))):body=body[:start]+body[end:]
    return dict(re.findall(r'(?m)^\s*(\w+)\s*=\s*([^,\r\n]+)',body))

def attachments(body):
    result={}
    for name,content,_,_ in blocks(body,'attachment'):
        p=properties(content)
        result[name]={'offset':nums(p.get('offset','0 0 0')),'rotate':nums(p.get('rotate','0 0 0')),'scale':float(p.get('scale',1)),'bone':p.get('bone',name).strip()}
    return result

def import_models(media,output,names):
    if output.exists():raise ValueError('Output exists; preserve it and select a fresh directory')
    definitions={}
    for path in sorted((media/'scripts').rglob('models*.txt')):
        for name,body,_,_ in blocks(path.read_text(),'model'):
            if name in names or name=='MaleBody':
                if name in definitions:raise ValueError('Conflicting model definition: '+name)
                definitions[name]=(path,body)
    result={'schema_version':1,'body':'MaleBody','parentAttachments':attachments(definitions['MaleBody'][1]),'models':{},'sources':[]}
    output.mkdir(parents=True)
    for name in names:
        script,body=definitions[name];p=properties(body);mesh=p['mesh'].strip();texture=p.get('texture',mesh).strip()
        path=media/'models_X'/(mesh+'.x');tex=media/'textures'/(texture+'.png')
        if path.exists():data=mesh_file(path)
        else:
            path=path.with_suffix('.fbx')
            if not path.is_file():raise FileNotFoundError(path)
            data=json.loads(subprocess.check_output(['node',str(Path(__file__).with_name('import_static_fbx.mjs')),str(path)],text=True))
        if len(data['bones'])!=1 or any(m['weights'] for m in data['meshes']):raise ValueError('Only single-root static X meshes supported: '+name)
        data.update(name=name,texture=name+'.png',scale=float(p.get('scale',1)),attachments=attachments(body),meshTransform=data['bones'][0]['matrix']);result['models'][name]=data;shutil.copy2(tex,output/data['texture'])
        for source in [script,path,tex]:result['sources'].append({'path':str(source.relative_to(media)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
    source=definitions['MaleBody'][0];result['sources'].append({'path':str(source.relative_to(media)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
    (output/'held-models.json').write_text(json.dumps(result,separators=(',',':')))
    return result

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--source',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--models',nargs='+',default=['Hammer','HammerForged','BallPeenHammer','BallPeenHammerForged','StoneHammer','SmithingHammer','Plank','BaseballBat']);a=ap.parse_args()
    data=import_models(a.source/'Project Zomboid.app/Contents/Java/media',a.output,a.models);print(json.dumps({'models':list(data['models']),'vertices':{k:sum(len(m['vertices'])//3 for m in v['meshes']) for k,v in data['models'].items()}}))
