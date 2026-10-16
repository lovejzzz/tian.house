import java.lang.reflect.*;import java.util.*;
// Executes the original non-clothing, non-attribute condition transfer branch.
public class DepletionConditionProbe {
 public static void main(String[]args)throws Exception{
  RecipeLoadProbe.main(new String[]{args[0]});Class<?> rand=Class.forName("zombie.core.random.RandStandard");rand.getMethod("init").invoke(rand.getField("INSTANCE").get(null));Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);Method alloc=u.getMethod("allocateInstance",Class.class);
  Class<?> c=Class.forName("zombie.inventory.InventoryItem"),d=Class.forName("zombie.inventory.types.DrainableComboItem"),table=Class.forName("se.krka.kahlua.vm.KahluaTable");
  for(int sourceMax:new int[]{1,10,37})for(int targetMax:new int[]{1,10,31})for(int condition:new int[]{0,1,7,10})for(boolean favorite:new boolean[]{false,true}){
   Object source=alloc.invoke(uf.get(null),d),target=alloc.invoke(uf.get(null),c);
   ItemUseProbe.set(c,source,"scriptItem",Class.forName("zombie.scripting.objects.Item").getConstructor().newInstance());ItemUseProbe.set(c,target,"scriptItem",Class.forName("zombie.scripting.objects.Item").getConstructor().newInstance());
   ItemUseProbe.set(c,source,"conditionMax",sourceMax);ItemUseProbe.set(c,source,"condition",Math.min(condition,sourceMax));ItemUseProbe.set(c,target,"conditionMax",targetMax);
   c.getMethod("setFavorite",boolean.class).invoke(source,favorite);c.getMethod("setHaveBeenRepaired",int.class).invoke(source,3);
   Object mod=c.getMethod("getModData").invoke(source);table.getMethod("rawset",Object.class,Object.class).invoke(mod,"condition:fixture",.625);table.getMethod("rawset",Object.class,Object.class).invoke(mod,"unrelated",99.0);
   c.getMethod("copyConditionStatesFrom",c).invoke(target,source);
   Map<String,Object>row=new LinkedHashMap<>();row.put("sourceMax",sourceMax);row.put("targetMax",targetMax);row.put("condition",Math.min(condition,sourceMax));row.put("favorite",favorite);row.put("after",c.getMethod("getCondition").invoke(target));row.put("broken",c.getMethod("isBroken").invoke(target));row.put("repaired",c.getMethod("getHaveBeenRepaired").invoke(target));row.put("favoriteAfter",c.getMethod("isFavorite").invoke(target));Object out=c.getMethod("getModData").invoke(target);row.put("conditionData",table.getMethod("rawget",Object.class).invoke(out,"condition:fixture"));row.put("unrelated",table.getMethod("rawget",Object.class).invoke(out,"unrelated"));System.out.println(RecipeLoadProbe.json(row));
  }
 }
}
