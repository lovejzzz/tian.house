// Executes the installed XML parser and rate accessor in isolation.
// This is source-component evidence, not observation of a running player graph.
import java.lang.reflect.*;
import java.nio.file.*;
import java.io.*;
public class AnimationNodeProbe {
 public static void main(String[] args) throws Exception {
  // Inherited nodes need the installed filesystem resolver. Run from the
  // installation's Java directory and isolate any cache under the experiment.
  if(System.getProperty("sre.probeCache")!=null){
   Class<?> fs=Class.forName("zombie.ZomboidFileSystem");Object instance=fs.getField("instance").get(null);
   fs.getMethod("setCacheDir",String.class).invoke(instance,System.getProperty("sre.probeCache"));
   fs.getMethod("init").invoke(instance);
  }
  Class<?> node = Class.forName("zombie.core.skinnedmodel.advancedanimation.AnimNode");
  Class<?> variables = Class.forName("zombie.core.skinnedmodel.advancedanimation.IAnimationVariableSource");
  try(PrintWriter out = new PrintWriter(Files.newBufferedWriter(Path.of(args[1]), StandardOpenOption.CREATE_NEW))) {
   out.println("path\tname\tclip\tparsedSpeed\tresolvedSpeed\trandomMin\trandomMax\tblends");
   for(String relative : args.length>2?java.util.Arrays.copyOfRange(args,2,args.length):new String[]{"idle/Idle.xml", "movement/defaultWalk.xml", "run/defaultRun.xml"}) {
    if(System.getProperty("sre.resolvedNodes")!=null){
     Class<?> xml=Class.forName("zombie.util.PZXmlUtil");
     Object element=xml.getMethod("parseXml",String.class).invoke(null,Path.of(args[0],relative).toString());
     String resolved=(String)xml.getMethod("elementToPrettyString",org.w3c.dom.Element.class).invoke(null,element);
     Path dest=Path.of(System.getProperty("sre.resolvedNodes"),relative);Files.createDirectories(dest.getParent());
     Files.writeString(dest,resolved,StandardOpenOption.CREATE_NEW);
    }
    Object value = node.getMethod("Parse", String.class).invoke(null, Path.of(args[0], relative).toString());
    if(value == null) throw new IllegalStateException("Source parser rejected " + relative);
    // The selected fixture nodes have literal rates: a null variable provider must suffice.
    out.println(relative+"\t"+node.getField("name").get(value)+"\t"+node.getField("animName").get(value)+"\t"+node.getField("speedScale").get(value)+"\t"+node.getMethod("getSpeedScale",variables).invoke(value,new Object[]{null})+"\t"+node.getField("speedScaleRandomMultiplierMin").get(value)+"\t"+node.getField("speedScaleRandomMultiplierMax").get(value)+"\t"+((java.util.List<?>)node.getField("blends2d").get(value)).size());
   }
  }
 }
}
