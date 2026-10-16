// Executes the installed body-angle interpolation with explicit animation inputs.
// No character, animation graph, or source-game timing is simulated here.
import java.lang.reflect.*;
import java.nio.file.*;
public class TurningProbe {
 static void set(Object o,String name,float value)throws Exception {Field f=o.getClass().getDeclaredField(name);f.setAccessible(true);f.setFloat(o,value);}
 public static void main(String[] args)throws Exception {
  Class<?> c=Class.forName("zombie.core.skinnedmodel.animation.AnimationPlayer");
  Constructor<?> ctor=c.getDeclaredConstructor();ctor.setAccessible(true);
  Method step=c.getDeclaredMethod("interpolateBodyAngle",float.class);step.setAccessible(true);
  StringBuilder out=new StringBuilder("angle\ttarget\tstep\tscale\tweight\tdeferred\tresult\ttwist\n");
  for(float angle:new float[]{0,-3.13f,3.13f,.73f})for(float target:new float[]{0,(float)Math.PI,-(float)Math.PI,.7305f,-1.2f})for(float amount:new float[]{.03f,.15f,1f})for(float weight:new float[]{0,.5f,1})for(float deferred:new float[]{-.2f,.2f}){
   Object p=ctor.newInstance();set(p,"angle",angle);set(p,"targetAngle",target);set(p,"angleStepDelta",.8f);set(p,"deferredRotationWeight",weight);set(p,"deferredAngleDelta",deferred);
   step.invoke(p,amount);
   out.append(angle+"\t"+target+"\t"+amount+"\t0.8\t"+weight+"\t"+deferred+"\t"+c.getMethod("getAngle").invoke(p)+"\t"+c.getMethod("getTargetTwistAngle").invoke(p)+"\n");
  }
  Files.writeString(Path.of(args[0]),out,StandardOpenOption.CREATE_NEW);
 }
}
