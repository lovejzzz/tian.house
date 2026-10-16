import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from import_recipes import collect

class RecipeDeclarationsTests(unittest.TestCase):
 def test_keeps_conflicting_declarations_and_nested_entity_components(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)
   (root/'a.txt').write_text('module Base { craftRecipe Fixture { time = 10, inputs { item 1 tags[base:hammer] mode:keep, } } entity Bench { component CraftRecipe { recipe = Fixture, } } }')
   (root/'b.txt').write_text('module Base { craftRecipe Fixture { time = 20, } }')
   result=collect(root)
   self.assertEqual(len(result['declarations']),3)
   a,component,b=result['declarations']
   self.assertEqual(a['children'][0]['values'],['item 1 tags[base:hammer] mode:keep'])
   self.assertEqual(component['path'],['module Base','entity Bench','component CraftRecipe'])
   self.assertEqual(component['kind'],'entity-component')
   self.assertEqual([a['properties']['time'],b['properties']['time']],[10,20])
   self.assertEqual(len(result['inputs']),2)

if __name__=='__main__':unittest.main()
