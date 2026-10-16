// Runs the installed game's height function on controlled square fixtures.
// This is component evidence, not a game-world traversal or rendering capture.
import java.lang.reflect.*;
import java.nio.file.*;
import java.io.*;
public class StairHeightProbe {
 public static void main(String[] args) throws Exception {
  Class<?> square=Class.forName("zombie.iso.IsoGridSquare");
  Object sq=square.getConstructor(Class.forName("zombie.iso.IsoCell"),Class.forName("zombie.iso.SliceY"),int.class,int.class,int.class).newInstance(null,null,10,20,2);
  Class<?> type=Class.forName("zombie.iso.SpriteDetails.IsoObjectType");
  Field flags=square.getField("hasTypes"),fbo=Class.forName("zombie.core.PerformanceSettings").getField("fboRenderChunk");
  Method height=square.getMethod("getApparentZ",float.class,float.class);
  try(PrintWriter out=new PrintWriter(Files.newBufferedWriter(Path.of(args[0]),StandardOpenOption.CREATE_NEW))) {
   out.println("type\tfbo\tx\ty\tz\theight");
   for(boolean render:new boolean[]{false,true}) for(String name:new String[]{"stairsBN","stairsMN","stairsTN","stairsBW","stairsMW","stairsTW"}) {
    Object t=type.getField(name).get(null);int index=(Integer)type.getMethod("index").invoke(t);
    flags.setLong(sq,1L<<index);fbo.setBoolean(null,render);
    for(float a:new float[]{-.2f,0f,.125f,.5f,.875f,1f,1.2f}) {
     float x=name.endsWith("W")?a:.5f,y=name.endsWith("N")?a:.5f;
     out.println(name+"\t"+render+"\t"+x+"\t"+y+"\t2\t"+height.invoke(sq,x,y));
    }
   }
  }
 }
}
