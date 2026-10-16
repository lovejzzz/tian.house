// Isolated original LiveAnimNode blend updates; not a running-game capture.
import java.lang.reflect.*;
import java.nio.file.*;
import java.io.*;
public class AnimationBlendProbe {
 public static void main(String[] args) throws Exception {
  Class<?> node=Class.forName("zombie.core.skinnedmodel.advancedanimation.AnimNode");
  Class<?> live=Class.forName("zombie.core.skinnedmodel.advancedanimation.LiveAnimNode");
  Constructor<?> ctor=live.getDeclaredConstructor();ctor.setAccessible(true);
  Field source=live.getDeclaredField("sourceNode"),raw=live.getDeclaredField("rawWeight");source.setAccessible(true);raw.setAccessible(true);
  try(PrintWriter out=new PrintWriter(Files.newBufferedWriter(Path.of(args[0]),StandardOpenOption.CREATE_NEW))){
   out.println("direction\tstep\tdt\traw\tweight");
   for(boolean incoming:new boolean[]{true,false}){
    Object n=node.getConstructor().newInstance();node.getField("blendTime").setFloat(n,.3f);
    Object l=ctor.newInstance();source.set(l,n);raw.setFloat(l,incoming?0:1);
    Method update=live.getDeclaredMethod(incoming?"updateBlendingIn":"updateBlendingOut",float.class);update.setAccessible(true);
    float[] deltas={0,.016666667f,.033333335f,.05f,.05f,0,.07f,.1f};
    for(int i=0;i<deltas.length;i++){
     update.invoke(l,deltas[i]);out.println((incoming?"in":"out")+"\t"+i+"\t"+deltas[i]+"\t"+raw.getFloat(l)+"\t"+live.getMethod("getWeight").invoke(l));
    }
   }
  }
 }
}
