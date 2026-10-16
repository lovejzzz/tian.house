import java.lang.reflect.*;import java.util.*;
public class DrainableUsesProbe{
 public static void main(String[] args)throws Exception{
  RecipeLoadProbe.main(new String[]{args[0]});Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);Method alloc=u.getMethod("allocateInstance",Class.class);Class<?> c=Class.forName("zombie.inventory.types.DrainableComboItem");
  for(float delta:new float[]{.0001f,.01f,.03125f,.1f,.2f,.3f,.3333333f,1f,2f})for(float fraction:new float[]{-.1f,0f,.05f,.125f,.5f,.9999f,1f,1.1f}){
   Object item=alloc.invoke(uf.get(null),c);c.getMethod("setUseDelta",float.class).invoke(item,delta);c.getMethod("setCurrentUsesFloat",float.class).invoke(item,fraction);
   Map<String,Object>row=new LinkedHashMap<>();row.put("delta",delta);row.put("fraction",fraction);row.put("max",c.getMethod("getMaxUses").invoke(item));row.put("uses",c.getMethod("getCurrentUses").invoke(item));row.put("fractionBits",Float.floatToIntBits((Float)c.getMethod("getCurrentUsesFloat").invoke(item)));System.out.println(RecipeLoadProbe.json(row));
  }
 }
}
