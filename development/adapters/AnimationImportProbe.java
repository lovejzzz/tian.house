// Reads installed Jassimp loadX output; optional clip names follow the output path.
import java.lang.reflect.*;import java.nio.file.*;import java.util.*;
public class AnimationImportProbe {
 @SuppressWarnings({"unchecked","rawtypes"}) public static void main(String[] args)throws Exception{
  Class<?> flags=Class.forName("jassimp.AiPostProcessSteps");Set steps=EnumSet.noneOf((Class)flags);
  for(String name:new String[]{"FIND_INSTANCES","MAKE_LEFT_HANDED","LIMIT_BONE_WEIGHTS","TRIANGULATE","OPTIMIZE_MESHES","REMOVE_REDUNDANT_MATERIALS","JOIN_IDENTICAL_VERTICES"})steps.add(flags.getField(name).get(null));
  StringBuilder out=new StringBuilder("clip\tbone\tindex\ttime\tx\ty\tz\tw\n");
  for(String clip:args.length>2?Arrays.copyOfRange(args,2,args.length):new String[]{"Bob_IdleTurn90L","Bob_IdleTurn90R","Bob_IdleTurn180L","Bob_IdleTurn180R"}){
   Object scene=Class.forName("jassimp.Jassimp").getMethod("importFile",String.class,Set.class).invoke(null,Path.of(args[0],clip+".x").toString(),steps);
   for(Object anim:(List<?>)scene.getClass().getMethod("getAnimations").invoke(scene)){
    double ticks=((Number)anim.getClass().getMethod("getTicksPerSecond").invoke(anim)).doubleValue();
    for(Object channel:(List<?>)anim.getClass().getMethod("getChannels").invoke(anim)){
     Class<?> c=channel.getClass();String bone=(String)c.getMethod("getNodeName").invoke(channel);
     for(int i=0;i<(Integer)c.getMethod("getNumRotKeys").invoke(channel);i++){
      out.append(clip+"\t"+bone+"\t"+i+"\t"+((Number)c.getMethod("getRotKeyTime",int.class).invoke(channel,i)).doubleValue()/ticks);
      for(String axis:new String[]{"X","Y","Z","W"})out.append("\t"+c.getMethod("getRotKey"+axis,int.class).invoke(channel,i));out.append("\n");
     }
    }
   }
  }
  Files.writeString(Path.of(args[1]),out,StandardOpenOption.CREATE_NEW);
 }
}
