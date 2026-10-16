"""Convert the installed textual DirectX mesh/skin/animation data for local use."""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET

NUM = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?')


def nums(s):
    return [float(x) for x in NUM.findall(s)]


def blocks(s, kind):
    for m in re.finditer(r'\b' + kind + r'(?:\s+(\w+))?\s*\{', s):
        if s[max(0,m.start()-9):m.start()].strip().endswith('template'):
            continue
        depth, i = 1, m.end()
        while depth and i < len(s):
            depth += (s[i] == '{') - (s[i] == '}')
            i += 1
        if depth:
            raise ValueError('Unclosed X block')
        yield m.group(1), s[m.end():i-1], m.start(), i


def mesh_file(path):
    s = path.read_text()
    frames = list(blocks(s, 'Frame'))
    bones = []
    for name, body, start, end in frames:
        matrix = next(blocks(body, 'FrameTransformMatrix'))[1]
        parents = [(b-a, n) for n,_,a,b in frames if a < start < end < b]
        bones.append(dict(name=name, parent=min(parents)[1] if parents else None, matrix=nums(matrix)))
    meshes = []
    for name, body, _, _ in blocks(s, 'Mesh'):
        values = nums(body.split('MeshNormals')[0].split('MeshMaterialList')[0])
        n, p = int(values[0]), 1
        vertices = values[p:p+n*3]; p += n*3
        count = int(values[p]); p += 1
        indices = []
        for _ in range(count):
            k = int(values[p]); p += 1
            face = [int(v) for v in values[p:p+k]]; p += k
            for j in range(1,k-1):
                indices.extend([face[0],face[j],face[j+1]])
        uvblock = next(blocks(body,'MeshTextureCoords'), None)
        uvs = nums(uvblock[1])[1:] if uvblock else [0]*(n*2)
        weights = []
        for _, b, _, _ in blocks(body,'SkinWeights'):
            bone = re.search(r'"([^"]+)"', b).group(1)
            v = nums(b.split('"',2)[2]); size = int(v[0])
            weights.append(dict(bone=bone, indices=[int(x) for x in v[1:1+size]],weights=v[1+size:1+size*2],inverse=v[1+size*2:]))
        meshes.append(dict(name=name,vertices=vertices,indices=indices,uvs=uvs,weights=weights))
    return dict(bones=bones,meshes=meshes)


def animation(path):
    s = path.read_text()
    ticks = next(blocks(s,'AnimTicksPerSecond'),None)
    ticks = nums(ticks[1])[0] if ticks else 4800
    channels = []
    for _, body, _, _ in blocks(s,'Animation'):
        ref = re.search(r'\{\s*(\w+)\s*\}',body)
        if not ref:
            continue
        for _, b, _, _ in blocks(body,'AnimationKey'):
            vals = nums(b); kind, count = int(vals[0]),int(vals[1]); p=2
            times, values = [],[]
            for _ in range(count):
                time,k = vals[p],int(vals[p+1]);p+=2
                times.append(time/ticks);values.append(vals[p:p+k]);p+=k
            channels.append(dict(bone=ref.group(1),kind=kind,times=times,values=values))
    return channels


def read_loaded_rotations(path):
    clips = {}
    with path.open() as stream:
        reader = csv.DictReader(stream, delimiter='\t')
        if reader.fieldnames != ['clip', 'bone', 'index', 'time', 'x', 'y', 'z', 'w']:
            raise ValueError('Unexpected loaded rotation columns')
        for row in reader:
            keys = clips.setdefault(row['clip'], {}).setdefault(row['bone'], [])
            time = float(row['time']); q = [float(row[k]) for k in ['x', 'y', 'z', 'w']]
            if int(row['index']) != len(keys) or not all(math.isfinite(v) for v in [time, *q]):
                raise ValueError('Invalid loaded rotation index or nonfinite value')
            if time < 0 or keys and time <= keys[-1][0] or sum(v*v for v in q) == 0:
                raise ValueError('Invalid loaded rotation time or quaternion')
            keys.append((time, [-q[3], q[0], q[1], q[2]]))
    if not clips:
        raise ValueError('Empty loaded rotation table')
    return clips


def apply_loaded_rotations(channels, loaded):
    rotations = {c['bone']: c for c in channels if c['kind'] == 0}
    if set(rotations) != set(loaded):
        raise ValueError('Loaded rotation bones do not match source text channels')
    # Validate the complete clip before changing any channel.
    for bone, channel in rotations.items():
        keys = loaded[bone]
        if len(keys) != len(channel['times']) or any(abs(t-key[0]) > 1e-9 for t, key in zip(channel['times'], keys)):
            raise ValueError(f'Loaded rotation key timeline mismatch: {bone}')
    for bone, channel in rotations.items():
        channel['values'] = [q for _, q in loaded[bone]]


def node_metadata(path, resolved_path=None):
    root = ET.parse(path).getroot()
    if root.get('x_extends'):
        if resolved_path is None:
            raise ValueError(f'Inherited node requires original-parser resolved XML: {path}')
        root = ET.parse(resolved_path).getroot()
        if root.findtext('m_Name') != ET.parse(path).getroot().findtext('m_Name'):
            raise ValueError('Resolved node identity mismatch')
    return {
        'node': root.findtext('m_Name'),
        'clip': root.findtext('m_AnimName'),
        'loop': root.findtext('m_Looped', 'true') == 'true',
        'speed': float(root.findtext('m_SpeedScale', '1')),
        'blendTime': float(root.findtext('m_BlendTime', '.2')),
        'deferredBone': root.findtext('m_DeferredBoneName'),
        'deferredAxis': root.findtext('m_deferredBoneAxis'),
        'useDeferredRotation': root.findtext('m_useDeferedRotation', 'false') == 'true',
        'definition': ET.tostring(root, encoding='unicode'),
        'boneWeights': [{child.tag: child.text for child in weight}
                        for weight in root.findall('m_SubStateBoneWeights')],
        'events': [{child.tag: child.text for child in event}
                   for event in root.findall('m_Events')],
    }


def main():
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True)
    p.add_argument('--output',type=Path,default=Path(__file__).parent/'private-assets/characters')
    p.add_argument('--resolved-nodes', type=Path, help='Private XML exported by installed PZXmlUtil for inherited nodes')
    p.add_argument('--loaded-rotations', type=Path, help='Private TSV exported by installed Jassimp; matching clips require complete rotation coverage')
    a=p.parse_args();media=a.source/'Project Zomboid.app/Contents/Java/media'
    loaded_rotations=read_loaded_rotations(a.loaded_rotations) if a.loaded_rotations else {}
    used_loaded=set()
    if a.output.exists(): raise SystemExit('Output exists; preserve it and select --output')
    a.output.mkdir(parents=True)
    parts=[('body','Skinned/MaleBody.x','Male_Body.png'),('shirt','Skinned/Clothes/Bob_Shirt_Bowling.x','Clothes/Shirt_Tshirt_Textures/Shirt_Bowling_Blue.png'),('trousers','Skinned/Clothes/Bob_Trousers.x','Trousers_Denim.png'),('hair','Skinned/Hair/Bob_Hair_Short.x',None)]
    result=dict(schema_version=1,parts=[],animations={},sources=[])
    if a.loaded_rotations:
        result['sources'].append(dict(path='runtime-loaded-rotations.tsv',sha256=hashlib.sha256(a.loaded_rotations.read_bytes()).hexdigest()))
    for name,relative,texture in parts:
        path=media/'models_X'/relative
        if not path.exists():
            if name=='hair': continue
            raise FileNotFoundError(path)
        model=mesh_file(path);model['name']=name
        if texture and (media/'textures'/texture).exists():
            shutil.copyfile(media/'textures'/texture,a.output/Path(texture).name);model['texture']=Path(texture).name
        result['parts'].append(model)
        result['sources'].append(dict(path=relative,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    defaults_path=media/'AnimSets/Defaults.xml'
    result['motionScale']=float(ET.parse(defaults_path).getroot().findtext('MotionScale'))
    result['sources'].append(dict(path='AnimSets/Defaults.xml',sha256=hashlib.sha256(defaults_path.read_bytes()).hexdigest()))
    result['animationMetadata'] = {}
    for name,relative in [('idle','Bob/Bob_Idle.x'),('build','Bob/Bob_IdleHammering.x'),('readBook','Bob/Bob_IdleReadBook.x'),('walk','Bob/Bob_Walk.x'),('run','Bob/Bob_Run.x'),('idleToRun','Bob/Bob_IdleToRun.x'),('runToStop','Bob/Bob_RunToStop.x'),('climbWindowStart','Bob/Bob_ClimbWindowStart.x'),('climbWindowEnd','Bob/Bob_ClimbWindowEnd.x'),('openWindowStart','Bob/Bob_WindowStruggle_Start.x'),('openWindowSuccess','Bob/Bob_WindowStruggleSuccess.x'),('openWindowStruggle','Bob/Bob_WindowStruggleLoop.x'),('openWindowFail','Bob/Bob_WindowStruggle_Fail.x'),('closeWindowStart','Bob/Bob_WindowCloseStart.x'),('closeWindowSuccess','Bob/Bob_WindowCloseSuccess.x'),('turnIdle90L','Bob/Bob_IdleTurn90L.x'),('turnIdle90R','Bob/Bob_IdleTurn90R.x'),('turnIdle180L','Bob/Bob_IdleTurn180L.x'),('turnIdle180R','Bob/Bob_IdleTurn180R.x')]:
        path=media/'anims_X'/relative
        channels=animation(path)  # Required clips must not silently disappear.
        if path.stem in loaded_rotations:
            apply_loaded_rotations(channels, loaded_rotations[path.stem]);used_loaded.add(path.stem)
        if not channels or not any(c['times'] for c in channels):
            raise ValueError(f'Empty required animation: {relative}')
        result['animations'][name]=channels
        result['animationMetadata'][name]={'loop':name in {'idle','walk','run'},'duration':max(t for c in channels for t in c['times'])}
        result['sources'].append(dict(path=relative,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        node_paths={'readBook':'actions/book.xml','build':'actions/Build.xml','climbWindowStart':'climbwindow/start.xml','climbWindowEnd':'climbwindow/end.xml','openWindowStart':'openwindow/start.xml','openWindowSuccess':'openwindow/success.xml','openWindowStruggle':'openwindow/trying.xml','openWindowFail':'openwindow/fail.xml','closeWindowStart':'closewindow/start.xml','closeWindowSuccess':'closewindow/success.xml','turnIdle90L':'turning/turn_idle_90L.xml','turnIdle90R':'turning/turn_idle_90R.xml','turnIdle180L':'turningIdle180/turn_idle_180L.xml','turnIdle180R':'turningIdle180/turn_idle_180R.xml'}
        if name in node_paths:
            node_path=media/'AnimSets/player'/node_paths[name]
            resolved_path=a.resolved_nodes/node_paths[name] if a.resolved_nodes else None
            metadata=node_metadata(node_path, resolved_path)
            if resolved_path and resolved_path.exists():
                result['sources'].append(dict(path='resolved/'+node_paths[name],sha256=hashlib.sha256(resolved_path.read_bytes()).hexdigest()))
            if metadata['clip'] != path.stem: raise ValueError('Node clip mismatch')
            result['animationMetadata'][name].update(metadata)
            result['sources'].append(dict(path=str(node_path.relative_to(media)),sha256=hashlib.sha256(node_path.read_bytes()).hexdigest()))
    if used_loaded != set(loaded_rotations):
        raise ValueError('Loaded rotation table contains unconsumed clips')
    result['runtimeLoadedRotationClips']=sorted(used_loaded)
    (a.output/'character.json').write_text(json.dumps(result,separators=(',',':')))
    print(json.dumps(dict(parts=len(result['parts']),bones=len(result['parts'][0]['bones']),animations={k:len(v) for k,v in result['animations'].items()})))


if __name__=='__main__': main()
