import java.lang.reflect.*;
import java.util.Arrays;

// Runs the installed attachment function, not a copy of its implementation.
// Reflection permits compilation on Java 21 and execution with the game's Java 25.
public class GroundAttachmentProbe {
 public static void main(String[] args) throws Exception {
  Class<?> a=Class.forName("zombie.scripting.objects.ModelAttachment"),m=Class.forName("org.joml.Matrix4f"),v=Class.forName("org.joml.Vector3f");
  Method make=Class.forName("zombie.core.skinnedmodel.model.ModelInstanceRenderData").getMethod("makeAttachmentTransform",a,m);
  float[][] cases={{0,0,0,0,0,0,1},{1,2,0,0,0,90,2},{-.2f,.3f,.4f,31,-42,73,.125f},{3,-2,1,180,90,-90,.45f}};
  System.out.println("[");
  for(int i=0;i<cases.length;i++){
   float[] c=cases[i];Object attachment=a.getConstructor(String.class).newInstance("world");
   v.getMethod("set",float.class,float.class,float.class).invoke(a.getMethod("getOffset").invoke(attachment),c[0],c[1],c[2]);
   v.getMethod("set",float.class,float.class,float.class).invoke(a.getMethod("getRotate").invoke(attachment),c[3],c[4],c[5]);
   a.getMethod("setScale",float.class).invoke(attachment,c[6]);
   Object matrix=make.invoke(null,attachment,m.getConstructor().newInstance());m.getMethod("invert").invoke(matrix);
   float[] values=new float[16];m.getMethod("get",float[].class).invoke(matrix,(Object)values);
   System.out.print("{\"input\":"+Arrays.toString(c)+",\"inverse\":"+Arrays.toString(values)+"}"+(i+1<cases.length?",\n":"\n"));
  }
  System.out.println("]");
 }
}
