// Executes installed node parsing and transition timing accessors in isolation.
import java.lang.reflect.*;
import java.nio.file.*;
import java.io.*;
public class TransitionTimingProbe {
 public static void main(String[] args) throws Exception {
  Class<?> node=Class.forName("zombie.core.skinnedmodel.advancedanimation.AnimNode"),live=Class.forName("zombie.core.skinnedmodel.advancedanimation.LiveAnimNode"),transition=Class.forName("zombie.core.skinnedmodel.advancedanimation.AnimTransition"),track=Class.forName("zombie.core.skinnedmodel.animation.AnimationTrack");
  Constructor<?> ctor=live.getDeclaredConstructor();ctor.setAccessible(true);
  Field source=live.getDeclaredField("sourceNode");source.setAccessible(true);
  Method parse=node.getMethod("Parse",String.class);
  Object idle=parse.invoke(null,Path.of(args[0],"idle/Idle.xml").toString()),run=parse.invoke(null,Path.of(args[0],"run/defaultRun.xml").toString());
  try(PrintWriter out=new PrintWriter(Files.newBufferedWriter(Path.of(args[1]),StandardOpenOption.CREATE_NEW))){
   out.println("clip\tspeedSetting\tblendIn\tblendOut\tmainRewind\tsyncAdjust");
   for(String clip:new String[]{"Bob_IdleToRun","Bob_RunToStop"}){
    Object from=clip.equals("Bob_IdleToRun")?idle:run,to=from==idle?run:idle;
    Object selected=null;
    for(Object t:(java.util.List<?>)node.getField("transitions").get(from))if(clip.equals(transition.getField("animName").get(t)))selected=t;
    if(selected==null)throw new IllegalStateException("Missing transition "+clip);
    Object l=ctor.newInstance();source.set(l,to);
    Object tr=track.getMethod("alloc").invoke(null);
    live.getMethod("startTransitionIn",node,transition,track).invoke(l,from,selected,tr);
    out.println(clip+"\t"+transition.getField("speedScale").get(selected)+"\t"+live.getMethod("getTransitionInBlendInTime").invoke(l)+"\t"+live.getMethod("getTransitionInBlendOutTime").invoke(l)+"\t"+live.getMethod("getMainInitialRewindTime").invoke(l)+"\t"+transition.getField("syncAdjustTime").get(selected));
   }
  }
 }
}
