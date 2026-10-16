// Installed GameTime conversion component only; no game-level duration claim.
import java.lang.reflect.*;import java.nio.file.*;
public class TimedActionClockProbe {
 public static void main(String[] args)throws Exception{
  Class<?> type=Class.forName("zombie.GameTime");Object clock=type.getConstructor().newInstance();
  StringBuilder result=new StringBuilder("seconds\tactionUnits\n");
  for(float seconds:new float[]{1f/120,1f/60,1f/30,.1f,1f}){
   Object units=type.getMethod("getMultiplierFromTimeDelta",float.class).invoke(clock,seconds);
   result.append(seconds+"\t"+units+"\n");
  }
  Files.writeString(Path.of(args[0]),result,StandardOpenOption.CREATE_NEW);
 }
}
