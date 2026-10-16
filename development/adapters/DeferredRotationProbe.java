// Installed rotation extraction on explicitly supplied quaternions. This does
// not establish that the original asset loader supplies those same quaternions.
import java.lang.reflect.*;import java.nio.file.*;
public class DeferredRotationProbe {
 public static void main(String[] args)throws Exception{
  Class<?> q=Class.forName("org.lwjgl.util.vector.Quaternion"),h=Class.forName("zombie.core.skinnedmodel.HelperFunctions");
  Constructor<?> ctor=q.getConstructor(float.class,float.class,float.class,float.class);
  Method angle=h.getMethod("getRotationZ",q);
  StringBuilder out=new StringBuilder("clip\tindex\tangle\n");
  for(String line:Files.readAllLines(Path.of(args[0])).subList(1,Files.readAllLines(Path.of(args[0])).size())){
   String[] v=line.split("\t");Object quat=ctor.newInstance(Float.parseFloat(v[2]),Float.parseFloat(v[3]),Float.parseFloat(v[4]),Float.parseFloat(v[5]));
   out.append(v[0]+"\t"+v[1]+"\t"+angle.invoke(null,quat)+"\n");
  }
  Files.writeString(Path.of(args[1]),out,StandardOpenOption.CREATE_NEW);
 }
}
