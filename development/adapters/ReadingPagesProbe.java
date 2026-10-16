import java.lang.reflect.*;
// Direct native Literature page setter/getter, no action validity or gameplay.
public class ReadingPagesProbe {
 public static void main(String[] args)throws Exception{
  Class<?> u=Class.forName("sun.misc.Unsafe");Field f=u.getDeclaredField("theUnsafe");f.setAccessible(true);
  Class<?> literature=Class.forName("zombie.inventory.types.Literature");
  Object item=u.getMethod("allocateInstance",Class.class).invoke(f.get(null),literature);
  literature.getMethod("setNumberOfPages",int.class).invoke(item,220);
  System.out.println("input,stored");
  for(int value:new int[]{-1,0,219,220,221,Integer.MAX_VALUE}){
   literature.getMethod("setAlreadyReadPages",int.class).invoke(item,value);
   System.out.println(value+","+literature.getMethod("getAlreadyReadPages").invoke(item));
  }
 }
}
