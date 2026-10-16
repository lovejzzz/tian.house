"""Malformed format and coordinate/order tests, using synthetic fixtures."""
import importlib.util
from pathlib import Path
import struct
import json
import tempfile
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/(name+'.py'))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
assets=load('import_assets');world=load('import_world');characters=load('import_characters')
class ImporterTests(unittest.TestCase):
    def test_texture_import_failure_leaves_no_partial_destination_and_can_retry(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);out=root/'library'
            def unpack(path,stage):
                (stage/(path.stem+'.png')).write_bytes(b'fixture')
                if path.stem=='bad':raise ValueError('injected late pack failure')
                return {'tile':{'page':path.stem+'.png'}},{'file':path.name,'pages':[]}
            with patch.object(assets,'unpack',side_effect=unpack):
                with self.assertRaisesRegex(ValueError,'late pack failure'):assets.import_library(root,out,['good','bad'])
                self.assertFalse(out.exists());self.assertFalse(list(root.glob('.library-stage-*')))
                manifest=assets.import_library(root,out,['good','good2x'])
            self.assertTrue((out/'atlas.json').exists())
            self.assertEqual(manifest['regions']['tile'],{'page':'good2x.png','scale':2})
            self.assertEqual(manifest['overrides'],[{'id':'tile','previousPage':'good.png','selectedPage':'good2x.png'}])
            with self.assertRaises(FileExistsError):assets.import_library(root,out,['good'])
            self.assertEqual((out/'good.png').read_bytes(),b'fixture')
    def test_supplement_is_additive_and_failed_manifest_publication_rolls_back(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);out=root/'library';out.mkdir()
            original=json.dumps(dict(schema_version=1,packs=[],regions={'old':{'page':'old.png'}}))
            (out/'atlas.json').write_text(original);(out/'old.png').write_bytes(b'old')
            def unpack(path,stage):
                (stage/'new.png').write_bytes(b'new')
                return {'new':{'page':'new.png'}},{'file':path.name,'pages':[{'file':'new.png'}]}
            with patch.object(assets,'unpack',side_effect=unpack),patch.object(Path,'replace',side_effect=OSError('manifest failure')):
                with self.assertRaisesRegex(OSError,'manifest failure'):assets.supplement_library(root,out,['Extra2x'])
            self.assertEqual((out/'atlas.json').read_text(),original);self.assertFalse((out/'new.png').exists())
            with patch.object(assets,'unpack',side_effect=unpack):result=assets.supplement_library(root,out,['Extra2x'])
            self.assertEqual(result['regions']['old'],{'page':'old.png'});self.assertEqual(result['regions']['new']['scale'],2)
            self.assertEqual((out/'old.png').read_bytes(),b'old');self.assertEqual((out/'new.png').read_bytes(),b'new')
            with self.assertRaisesRegex(ValueError,'already imported'):assets.supplement_library(root,out,['Extra2x'])
    def test_supplement_rejects_existing_sprite_ids_without_writing(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);out=root/'library';out.mkdir()
            original=json.dumps(dict(packs=[],regions={'old':{'page':'old.png'}}));(out/'atlas.json').write_text(original)
            with patch.object(assets,'unpack',return_value=({'old':{}},{'pages':[]})):
                with self.assertRaisesRegex(ValueError,'must not replace'):assets.supplement_library(root,out,['Extra'])
            self.assertEqual((out/'atlas.json').read_text(),original);self.assertEqual(len(list(out.iterdir())),1)

    def test_ui2_override_priority_matches_existing_library(self):
        self.assertGreater(assets.PACK_NAMES.index('UI2'),assets.PACK_NAMES.index('Tiles2x'))
        self.assertIn('Overlays2x.floor',assets.PACK_NAMES)

    def test_texture_publish_failure_keeps_destination_absent(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);out=root/'library'
            with patch.object(assets,'unpack',return_value=({},dict(pages=[]))),patch.object(Path,'rename',side_effect=OSError('injected rename failure')):
                with self.assertRaisesRegex(OSError,'rename failure'):assets.import_library(root,out,['good'])
            self.assertFalse(out.exists());self.assertFalse(list(root.glob('.library-stage-*')))

    def test_loaded_rotations_validate_full_coverage_and_preserve_runtime_values(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'keys.tsv';header='clip\tbone\tindex\ttime\tx\ty\tz\tw\n'
            p.write_text(header+'Turn\tBip01\t0\t0\t0.1\t0.2\t0.3\t0.9\nTurn\tBip01\t1\t1\t0\t0\t1\t0\n')
            loaded=characters.read_loaded_rotations(p)['Turn']
            channels=[dict(bone='Bip01',kind=0,times=[0,1],values=[[1,0,0,0]]*2)]
            characters.apply_loaded_rotations(channels,loaded)
            self.assertEqual(channels[0]['values'][0],[-.9,.1,.2,.3])
            for invalid in [{}, {'Other':loaded['Bip01']}, {'Bip01':loaded['Bip01'][:1]}]:
                with self.assertRaises(ValueError):characters.apply_loaded_rotations(channels,invalid)
            for row in ['Turn\tBip01\t1\t0\t0\t0\t0\t1\n','Turn\tBip01\t0\t0\tnan\t0\t0\t1\n','Turn\tBip01\t0\t0\t0\t0\t0\t0\n']:
                p.write_text(header+row)
                with self.assertRaises(ValueError):characters.read_loaded_rotations(p)

    def test_inherited_node_requires_resolved_source_and_keeps_rotation_definition(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'child.xml';resolved=Path(d)/'resolved.xml'
            p.write_text('<animNode x_extends="parent.xml"><m_Name>turn</m_Name></animNode>')
            with self.assertRaises(ValueError):characters.node_metadata(p)
            resolved.write_text('<animNode><m_Name>other</m_Name></animNode>')
            with self.assertRaises(ValueError):characters.node_metadata(p,resolved)
            resolved.write_text('<animNode><m_Name>turn</m_Name><m_AnimName>Turn</m_AnimName><m_SpeedScale>0.8</m_SpeedScale><m_DeferredBoneName>Bip01</m_DeferredBoneName><m_deferredBoneAxis>Z</m_deferredBoneAxis><m_useDeferedRotation>true</m_useDeferedRotation><m_SubStateBoneWeights><boneName>Spine</boneName><weight>0.25</weight></m_SubStateBoneWeights></animNode>')
            data=characters.node_metadata(p,resolved)
            self.assertEqual(data['speed'],.8);self.assertTrue(data['useDeferredRotation'])
            self.assertEqual(data['deferredBone'],'Bip01');self.assertEqual(data['deferredAxis'],'Z')
            self.assertIn('<weight>0.25</weight>',data['definition'])

    def test_animation_events_preserve_phase_and_repeated_event_types(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'node.xml'
            p.write_text('<animNode><m_Name>end</m_Name><m_AnimName>Clip</m_AnimName><m_Looped>false</m_Looped><m_SpeedScale>0.96</m_SpeedScale><m_Events><m_EventName>SetVariable</m_EventName><m_Time>Start</m_Time><m_ParameterValue>End=true</m_ParameterValue></m_Events><m_Events><m_EventName>SetVariable</m_EventName><m_TimePc>0.6</m_TimePc><m_ParameterValue>Finished=true</m_ParameterValue></m_Events></animNode>')
            result=characters.node_metadata(p)
            self.assertFalse(result['loop']);self.assertEqual(result['speed'],.96)
            self.assertEqual(len(result['events']),2)
            self.assertEqual(result['events'][0]['m_Time'],'Start')
            self.assertEqual(result['events'][1]['m_TimePc'],'0.6')
            self.assertEqual(result['events'][1]['m_ParameterValue'],'Finished=true')

    def test_node_preserves_bone_mask_entries_without_inventing_defaults(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'book.xml'
            p.write_text('<animNode><m_Name>book</m_Name><m_AnimName>Read</m_AnimName><m_SubStateBoneWeights><boneName>Spine</boneName><weight>0.50</weight><includeDescendants>false</includeDescendants></m_SubStateBoneWeights><m_SubStateBoneWeights><boneName>Spine1</boneName></m_SubStateBoneWeights></animNode>')
            result=characters.node_metadata(p)
            self.assertEqual(result['boneWeights'],[{'boneName':'Spine','weight':'0.50','includeDescendants':'false'},{'boneName':'Spine1'}])

    def test_pack_rejects_truncation_and_oversized_string(self):
        with self.assertRaises(ValueError):assets.Reader(b'\x01').integer()
        with self.assertRaises(ValueError):assets.Reader(struct.pack('<i',999999)).string()
    def test_header_preserves_level_range_and_tile_names(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'test';p.write_bytes(b'LOTH'+struct.pack('<ii',1,2)+b'floor\nwall\n'+struct.pack('<4i',8,8,-1,3))
            self.assertEqual(world.header(p),(['floor','wall'],-1,3))
            p.write_bytes(b'LOTH'+struct.pack('<ii',1,0)+struct.pack('<4i',10,10,0,1))
            with self.assertRaises(ValueError):world.header(p)
    def test_map_coordinates_and_stack_order(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'map';start=8204;chunk=struct.pack('<6i',3,7,1,0,-1,63)
            offsets=b''.join(struct.pack('<ii',start+i*len(chunk),0)for i in range(1024))
            p.write_bytes(b'LOTP'+struct.pack('<ii',1,1024)+offsets+chunk*1024)
            rows=world.decode_cell(p,['floor','wall'],0,0)
            self.assertEqual(rows[0],[0,0,0,7,1,0]);self.assertEqual(rows[1],[0,8,0,7,1,0]);self.assertEqual(rows[32],[8,0,0,7,1,0])
    def test_nested_x_blocks_keep_hierarchy(self):
        blocks=list(characters.blocks('Frame A { FrameTransformMatrix {1;} Frame B { FrameTransformMatrix {2;} } }','Frame'))
        self.assertEqual([b[0]for b in blocks],['A','B'])
        with self.assertRaises(ValueError):list(characters.blocks('Frame A {','Frame'))
if __name__=='__main__':unittest.main()
