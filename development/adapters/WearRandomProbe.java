// Executes installed RandStandard/abstract/interface methods with a controlled
// java.util.Random. This is component evidence, not game-level tool wear.
import java.util.Random;
import java.lang.reflect.*;
public class WearRandomProbe {
 static class CountingRandom extends Random {
  int draws;
  @Override public int nextInt(int bound){draws++;return bound-1;}
 }
 public static void main(String[] args)throws Exception{
  Class<?> type=Class.forName("zombie.core.random.RandStandard");
  Constructor<?> ctor=type.getDeclaredConstructor();ctor.setAccessible(true);
  Object probe=ctor.newInstance();CountingRandom random=new CountingRandom();
  Field rand=type.getSuperclass().getDeclaredField("rand");rand.setAccessible(true);rand.set(probe,random);
  Method next=type.getMethod("NextBool",int.class);
  System.out.println("bound,hit,draws");
  for(int bound:new int[]{-3,0,1,5,33})System.out.println(bound+","+next.invoke(probe,bound)+","+random.draws);
 }
}
