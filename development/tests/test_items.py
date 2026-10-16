import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from import_items import parse, properties
class ScriptItemTests(unittest.TestCase):
 def test_nested_components_do_not_overwrite_item_weight_or_capacity(self):
  root=parse('module Base { item Bottle { Weight = 0.1, component FluidContainer { Capacity = 1.0, Fluids { fluid = Water:1.0, } } } }')
  item=root['children'][0]['children'][0]
  self.assertEqual(properties(item),{'Weight':.1});self.assertEqual(properties(item['children'][0]),{'Capacity':1.0})
 def test_comments_and_quoted_braces_do_not_change_structure(self):
  root=parse('/* } */ module Base { // }\n item X { Name = "A { B", Weight = 1, } }')
  self.assertEqual(properties(root['children'][0]['children'][0])['Name'],'A { B')
 def test_truncated_input_is_rejected(self):
  with self.assertRaises(ValueError):parse('module Base { item X { Weight = 1, }')
 def test_repeated_values_preserve_order_until_normalization(self):
  item=parse('module Base { item X { Icon = First, Icon = Second, CantEat = true, } }')['children'][0]['children'][0]
  self.assertEqual(len(item['values']),3);self.assertEqual(properties(item)['Icon'],'Second');self.assertIs(properties(item)['CantEat'],True)
if __name__=='__main__':unittest.main()
