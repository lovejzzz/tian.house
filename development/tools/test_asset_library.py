import io, unittest, tempfile, json, contextlib
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from build_asset_library import encode_exact, semantic, build, state_index, validate_ground_profiles
class AssetLibraryTests(unittest.TestCase):
 def test_exact_transparent_pixels(self):
  im=Image.new('RGBA',(2,2));im.putdata([(243,4,71,0),(5,200,61,1),(22,55,77,255),(99,111,44,128)])
  source=io.BytesIO();im.save(source,'PNG');encoded,_=encode_exact(source.getvalue())
  self.assertEqual(Image.open(io.BytesIO(encoded)).convert('RGBA').tobytes(),im.tobytes())
 def test_state_identity_kept_separate(self):
  recipe=dict(id='architecture',material=None,tags=['original'],provenance='Original')
  props={'window_N_0':dict(CustomName='Steel window',Facing='N',windowN='',OpenTileOffset='1',SmashedTileOffset='2',GlassRemovedOffset='3',TianVariantFamily='steel')}
  states=[semantic('window_N_'+str(i),dict(w=96,h=160),props.get('window_N_'+str(i),{}),recipe,props) for i in range(4)]
  self.assertEqual([e['state'] for e in states],['closed','open','broken','glass-removed'])
  self.assertEqual({e['family'] for e in states},{'steel'})
  self.assertEqual({e['direction'] for e in states},{'N'})
  self.assertTrue(all(e['material'] is None for e in states))
 def test_floor_and_structural_stair_semantics_are_distinct(self):
  recipe=dict(id='cafe',material=None,tags=['original'],provenance='Original')
  for props,kind in [({'solidfloor':''},'floor'),({'solidfloor':'','TianReturnStair':''},'stairs'),({'FloorOverlay':''},'rug')]:
   self.assertEqual(semantic('sample_0',dict(w=96,h=160),props,recipe,{'sample_0':props})['kind'],kind)
 def test_guard_is_an_edge_supported_structure_not_a_wall_decoration(self):
  recipe=dict(id='masonry',material=None,tags=['original'],provenance='Original')
  props={'TianGuard':'true','WallN':'','WallNTrans':'','Facing':'N'}
  entry=semantic('guard_N',dict(w=96,h=160),props,recipe,{'guard_N':props})
  self.assertEqual((entry['kind'],entry['support']),('guard','adjacent-floor-edge'))
  plain=semantic('plain_N',dict(w=96,h=160),{'WallN':''},recipe,{})
  self.assertIsNone(plain['support'])
 def test_state_links_reject_missing_self_and_ambiguous_targets(self):
  cases=[({'a_0':{'OpenTileOffset':'1'}},{'a_0':{}},'Missing state'),
         ({'a_0':{'OpenTileOffset':'0'}},{'a_0':{}},'Self-referencing'),
         ({'a_0':{'OpenTileOffset':'2'},'a_1':{'SmashedTileOffset':'1'}},None,'Ambiguous'),
         ({'a_0':{'OpenTileOffset':'oops'}},None,'Invalid state')]
  for props,regions,message in cases:
   with self.subTest(message=message),self.assertRaisesRegex(ValueError,message):state_index(props,regions)
 def test_duplicate_recipe_outputs_rejected_before_generator_runs(self):
  for field in ['id','module','page','generator']:
   with self.subTest(field=field),tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);recipe=self.fixture(root)
    second={**recipe,'id':'other','module':'src/other.js','page':'original-other.png','generator':'tools/other.py'}
    second[field]=recipe[field]
    (root/'assets/recipes/originals.json').write_text(json.dumps(dict(schemaVersion=1,recipes=[recipe,second])))
    with patch('build_asset_library.subprocess.run') as run:
     with self.assertRaisesRegex(ValueError,'Duplicate recipe '+field):build(root,True)
     run.assert_not_called()
    self.assertEqual((root/'src/sample.js').read_text(),'old module')
 def test_png_policy_does_not_run_webp_encoder(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.fixture(root)
   with patch('build_asset_library.encode_exact',side_effect=AssertionError('unnecessary encoder')),contextlib.redirect_stdout(io.StringIO()):
    report=build(root,True)
   self.assertEqual(report['pages'][0]['sourceSha256'],report['pages'][0]['runtimeSha256'])
 def test_orphan_properties_fail_without_publishing(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.fixture(root)
   script=root/'tools/generate.py'
   script.write_text(script.read_text().replace('"properties": {"sample_0"','"properties": {"missing_0"'))
   with self.assertRaisesRegex(ValueError,'Properties without sprite'):build(root,True)
   self.assertEqual((root/'src/sample.js').read_text(),'old module')
 def test_ground_profiles_validate_geometry_and_base_references(self):
  valid={'road':{'solidfloor':''},'cut':{'solidfloor':'','TianGroundHeight':'6','TianGroundPolygon':'[[0,0],[1,0],[0,1]]','TianGroundBase':'road'}}
  validate_ground_profiles(valid)
  for changes in [{'TianGroundBase':'missing'},{'TianGroundBase':'cut'},{'TianGroundPolygon':'null'},{'TianGroundPolygon':'[[0,0],[0,1],[1,0]]'},{'TianGroundPolygon':'[[0,0],[1,0],[0.3,0.3],[0,1]]'},{'TianGroundPolygon':'[[0,0],[1,0],[0,1],[0,0]]'},{'TianGroundHeight':'0'}]:
   with self.subTest(changes=changes),self.assertRaisesRegex(ValueError,'Invalid ground'):
    validate_ground_profiles({**valid,'cut':{**valid['cut'],**changes}})
 def fixture(self,root,broken=False):
  for directory in ['assets/recipes','private-assets','src','tools']:(root/directory).mkdir(parents=True)
  recipe=dict(id='sample',version=1,sourceKind='procedural',generator='tools/generate.py',module='src/sample.js',page='original-sample.png',parameters={},provenance='Test',tags=[],material=None,delivery='png')
  (root/'assets/recipes/originals.json').write_text(json.dumps(dict(schemaVersion=1,recipes=[recipe])))
  (root/'src/sample.js').write_text('old module')
  (root/'private-assets/original-sample.png').write_bytes(b'old image')
  data=dict(regions={'sample_0':dict(x=0,y=0,w=9 if broken else 2,h=2,ox=0,oy=0,page='original-sample.png')},properties={'sample_0':dict(CustomName='Example')})
  script="from pathlib import Path\nfrom PIL import Image\nr=Path(__file__).resolve().parents[1]\nImage.new('RGBA',(2,2),(2,4,6,255)).save(r/'private-assets/original-sample.png')\n(r/'src/sample.js').write_text("+repr('const data='+json.dumps(data)+';')+")\n"
  (root/'tools/generate.py').write_text(script)
  return recipe
 def test_failed_validation_does_not_publish_generated_files(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.fixture(root,broken=True)
   before={str(p.relative_to(root)):p.read_bytes() for p in root.rglob('*') if p.is_file()}
   with self.assertRaisesRegex(ValueError,'Out-of-bounds'):build(root,True)
   self.assertEqual(before,{str(p.relative_to(root)):p.read_bytes() for p in root.rglob('*') if p.is_file()})
 def test_generator_failure_does_not_publish_partial_outputs(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.fixture(root)
   script=root/'tools/generate.py';script.write_text(script.read_text()+"raise RuntimeError('injected failure')\n")
   with self.assertRaises(Exception):build(root,True)
   self.assertEqual((root/'src/sample.js').read_text(),'old module')
   self.assertEqual((root/'private-assets/original-sample.png').read_bytes(),b'old image')
 def test_publish_failure_rolls_back_completed_files(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.fixture(root)
   import os
   original=os.replace
   def replace(source,destination):
    if Path(destination).resolve()==(root/'src/sample.js').resolve():raise OSError('injected publish failure')
    return original(source,destination)
   with patch('build_asset_library.os.replace',side_effect=replace),contextlib.redirect_stdout(io.StringIO()):
    with self.assertRaisesRegex(OSError,'injected publish'):build(root,True)
   self.assertEqual((root/'private-assets/original-sample.png').read_bytes(),b'old image')
   self.assertEqual((root/'src/sample.js').read_text(),'old module')
   self.assertFalse(list(root.rglob('*.build-tmp')))
 def test_success_publishes_matching_module_catalog_and_report(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.fixture(root)
   with contextlib.redirect_stdout(io.StringIO()):report=build(root,True)
   self.assertEqual(report['pages'][0]['runtime'],'original-sample.png')
   catalogue=json.loads((root/'private-assets/semantic-catalog.json').read_text())
   self.assertEqual(catalogue['assets'][0]['id'],'sample_0')
   self.assertIn('TianRecipe',(root/'src/sample.js').read_text())
 def test_check_detects_stale_generator_without_repairing_live_files(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.fixture(root)
   with contextlib.redirect_stdout(io.StringIO()):build(root,True);build(root,check=True)
   generator=root/'tools/generate.py';generator.write_text(generator.read_text().replace('(2,4,6,255)','(4,8,12,255)'))
   before={str(p.relative_to(root)):(p.read_bytes(),p.stat().st_mtime_ns) for p in root.rglob('*') if p.is_file()}
   with self.assertRaisesRegex(ValueError,'stale'):build(root,check=True)
   after={str(p.relative_to(root)):(p.read_bytes(),p.stat().st_mtime_ns) for p in root.rglob('*') if p.is_file()}
   self.assertEqual(before,after)
 def test_check_rejects_missing_delivery_image_without_creating_it(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.fixture(root)
   with contextlib.redirect_stdout(io.StringIO()):build(root,True)
   page=root/'private-assets/original-sample.png';page.unlink()
   with self.assertRaisesRegex(ValueError,'stale'):build(root,check=True)
   self.assertFalse(page.exists())
if __name__=='__main__': unittest.main()
