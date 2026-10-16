import hashlib
import json
import struct
import tempfile
import unittest
from pathlib import Path
from check_imported_assets import check

class ImportedAssetTests(unittest.TestCase):
    def fixture(self,root):
        data=b'\x89PNG\r\n\x1a\n'+struct.pack('>I',13)+b'IHDR'+struct.pack('>II',8,8)
        (root/'page.png').write_bytes(data)
        manifest=dict(schema_version=1,packs=[dict(pages=[dict(file='page.png',sha256=hashlib.sha256(data).hexdigest(),width=8,height=8)])],regions={'tile':dict(page='page.png',x=0,y=0,w=8,h=8,ox=-2,oy=0,ow=8,oh=8,scale=2)})
        (root/'atlas.json').write_text(json.dumps(manifest))
        return manifest
    def test_valid_library_is_read_only_and_preserves_signed_anchors(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);self.fixture(root)
            before={p.name:(p.read_bytes(),p.stat().st_mtime_ns) for p in root.iterdir()}
            self.assertEqual(check(root)['regions'],1)
            self.assertEqual(before,{p.name:(p.read_bytes(),p.stat().st_mtime_ns) for p in root.iterdir()})
    def test_mutated_page_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);self.fixture(root);(root/'page.png').write_bytes(b'corrupted')
            with self.assertRaisesRegex(ValueError,'hash mismatch'):check(root)
    def test_manifest_errors_rejected(self):
        cases=[('page','missing.png','Unknown atlas'),('x',1,'outside atlas'),('ox',1.5,'Non-integer'),('scale',3,'Unknown sprite scale')]
        for field,value,message in cases:
            with self.subTest(field=field),tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);manifest=self.fixture(root);manifest['regions']['tile'][field]=value
                (root/'atlas.json').write_text(json.dumps(manifest))
                with self.assertRaisesRegex(ValueError,message):check(root)
    def test_duplicate_and_traversal_pages_rejected(self):
        for mode in ['duplicate','traversal']:
            with self.subTest(mode=mode),tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);manifest=self.fixture(root);pages=manifest['packs'][0]['pages']
                if mode=='duplicate':pages.append(pages[0].copy())
                else:pages[0]['file']='../page.png'
                (root/'atlas.json').write_text(json.dumps(manifest))
                with self.assertRaisesRegex(ValueError,'Duplicate atlas|local filename'):check(root)

if __name__=='__main__':unittest.main()
