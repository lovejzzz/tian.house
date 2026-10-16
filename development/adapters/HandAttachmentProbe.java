// Installed attachment-matrix component, isolated default state; not a game pose.
import java.lang.reflect.*;import java.nio.file.*;
public class HandAttachmentProbe {
 public static void main(String[] args)throws Exception{
  Class<?> attachment=Class.forName("zombie.scripting.objects.ModelAttachment"),vector=Class.forName("org.joml.Vector3f"),matrix=Class.forName("org.joml.Matrix4f"),render=Class.forName("zombie.core.skinnedmodel.model.ModelInstanceRenderData");
  Object a=attachment.getConstructor(String.class).newInstance("Bip01_Prop2");
  vector.getMethod("set",float.class,float.class,float.class).invoke(attachment.getMethod("getOffset").invoke(a),-.0131f,-.0221f,.0007f);
  vector.getMethod("set",float.class,float.class,float.class).invoke(attachment.getMethod("getRotate").invoke(a),0f,-86.9102f,0f);
  Object out=render.getMethod("makeAttachmentTransform",attachment,matrix).invoke(null,a,matrix.getConstructor().newInstance());
  float[] values=new float[16];matrix.getMethod("get",float[].class).invoke(out,(Object)values);
  Files.writeString(Path.of(args[0]),"{\"invertSelfDefault\":"+render.getField("invertAttachmentSelfTransform").getBoolean(null)+",\"matrix\":"+java.util.Arrays.toString(values)+"}",StandardOpenOption.CREATE_NEW);
 }
}
