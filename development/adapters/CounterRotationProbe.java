// Executes the installed helper chain used by the ordinary (non-debug,
// non-ragdoll) counter-rotation branch; not the full animation blender.
import java.lang.reflect.*;import java.nio.file.*;
public class CounterRotationProbe {
 public static void main(String[] args)throws Exception{
  Class<?> q=Class.forName("org.lwjgl.util.vector.Quaternion"),v=Class.forName("org.lwjgl.util.vector.Vector3f"),h=Class.forName("zombie.core.skinnedmodel.HelperFunctions");
  Method euler=h.getMethod("ToEulerAngles",q,v),quat=h.getMethod("ToQuaternion",double.class,double.class,double.class,q);
  StringBuilder out=new StringBuilder("clip\tindex\tx\ty\tz\tw\n");
  for(String line:Files.readAllLines(Path.of(args[0]))){String[] row=line.split("\t");if(row.length!=8||!row[1].equals("Bip01"))continue;
   Object value=q.getConstructor(float.class,float.class,float.class,float.class).newInstance(Float.parseFloat(row[4]),Float.parseFloat(row[5]),Float.parseFloat(row[6]),Float.parseFloat(row[7]));
   Object angles=euler.invoke(null,value,v.getConstructor().newInstance());quat.invoke(null,(double)v.getField("x").getFloat(angles),(double)v.getField("y").getFloat(angles),(double)(float)(Math.PI/2),value);
   out.append(row[0]+"\t"+row[2]);for(String axis:new String[]{"x","y","z","w"})out.append("\t"+q.getField(axis).getFloat(value));out.append("\n");
  }
  Files.writeString(Path.of(args[1]),out,StandardOpenOption.CREATE_NEW);
 }
}
