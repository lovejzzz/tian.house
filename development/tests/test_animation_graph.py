import importlib.util
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('graph',Path(__file__).resolve().parents[1]/'import_animation_graph.py')
graph=importlib.util.module_from_spec(spec);spec.loader.exec_module(graph)

class AnimationGraphTests(unittest.TestCase):
    def test_repeated_blends_conditions_and_attributes_are_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'node.xml'
            path.write_text('<animNode><m_Name>walk</m_Name><m_AnimName>Walk</m_AnimName><m_2DBlends referenceID="1"><m_AnimName>Walk</m_AnimName><m_SpeedScale>0.8</m_SpeedScale></m_2DBlends><m_2DBlends referenceID="2"><m_AnimName>Limp</m_AnimName></m_2DBlends><m_Conditions><m_Name>injury</m_Name><m_Value>0</m_Value></m_Conditions></animNode>')
            node=graph.read_node(path)
            self.assertEqual(node['clips'],['Limp','Walk'])
            children=node['definition']['children']
            self.assertEqual([c['attributes'].get('referenceID') for c in children if c['tag']=='m_2DBlends'],['1','2'])
            self.assertEqual(children[-1]['children'][-1]['text'],'0')
    def test_non_node_and_truncated_xml_do_not_silently_import(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'node.xml'
            for text in ['<animNode/>','<other/>','<animNode>']:
                path.write_text(text)
                with self.assertRaises((ValueError,graph.ET.ParseError)):graph.read_node(path)
