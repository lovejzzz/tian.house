// Executes installed defaults loading and deferred movement coordinate transforms.
// Does not execute a player, collision or the full animation graph.
import java.lang.reflect.*;import java.nio.file.*;import java.io.*;
public class RootMotionProbe {
 public static void main(String[] args)throws Exception{
  Class<?> animator=Class.forName("zombie.core.skinnedmodel.advancedanimation.AdvancedAnimator"),track=Class.forName("zombie.core.skinnedmodel.animation.AnimationTrack"),player=Class.forName("zombie.core.skinnedmodel.animation.AnimationPlayer"),v2=Class.forName("zombie.iso.Vector2"),v3=Class.forName("org.lwjgl.util.vector.Vector3f");
  Method defaults=animator.getDeclaredMethod("LoadDefaults");defaults.setAccessible(true);defaults.invoke(null);
  float scale=animator.getField("motionScale").getFloat(null);if(scale!=1.6f)throw new IllegalStateException("Unexpected loaded scale "+scale);
  Object t=track.getMethod("alloc").invoke(null);
  Method project=track.getDeclaredMethod("getDeferredMovement",v3,v2);project.setAccessible(true);
  Method rotate=player.getDeclaredMethod("applyRotationToDeferredMovement",v2,float.class);rotate.setAccessible(true);
  try(PrintWriter out=new PrintWriter(Files.newBufferedWriter(Path.of(args[0]),StandardOpenOption.CREATE_NEW))){
   out.println("x\ty\tz\trenderedAngle\tscale\toutX\toutY");
   for(float[] delta:new float[][]{{0,0,0},{0,0,-.1f},{.2f,.7f,-.3f},{-.25f,-.5f,.4f}})for(float angle:new float[]{0,(float)Math.PI/2,(float)Math.PI,(float)-Math.PI/2,.73f}){
    Object vec=v2.getConstructor().newInstance();project.invoke(t,v3.getConstructor(float.class,float.class,float.class).newInstance(delta[0],delta[1],delta[2]),vec);rotate.invoke(null,vec,angle);
    out.println(delta[0]+"\t"+delta[1]+"\t"+delta[2]+"\t"+angle+"\t"+scale+"\t"+(v2.getField("x").getFloat(vec)*scale)+"\t"+(v2.getField("y").getFloat(vec)*scale));
   }
  }
 }
}
