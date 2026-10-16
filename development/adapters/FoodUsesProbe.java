import java.lang.reflect.*;import java.util.*;
public class FoodUsesProbe {
 public static void main(String[]args)throws Exception{
  RecipeLoadProbe.main(new String[]{args[0]});Class<?> rand=Class.forName("zombie.core.random.RandStandard");rand.getMethod("init").invoke(rand.getField("INSTANCE").get(null));Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);Method alloc=u.getMethod("allocateInstance",Class.class);Class<?> c=Class.forName("zombie.inventory.types.Food"),ic=Class.forName("zombie.inventory.InventoryItem");
  String[] fields={"HungChange","BoredomChange","UnhappyChange","ThirstChange","PainReduction","EndChange","StressChange","FatigueChange","Calories","Carbohydrates","Proteins","Lipids"};
  String[] getters={"getHungChange","getBoredomChangeUnmodified","getUnhappyChangeUnmodified","getThirstChangeUnmodified","getPainReduction","getEnduranceChangeUnmodified","getStressChangeUnmodified","getFatigueChange","getCalories","getCarbohydrates","getProteins","getLipids"};
  for(String freshness:new String[]{"fresh","stale","rotten","burnt","cooked"})for(float base:new float[]{-.4f,-.375f,-.01f,-.009f,0f,.2f})for(float portion:new float[]{0f,.25f,1f})for(int requested:new int[]{0,1,3,40}){
   Object item=alloc.invoke(uf.get(null),c);c.getMethod("setAge",float.class).invoke(item,freshness.equals("stale")?2f:freshness.equals("rotten")?4f:0f);c.getMethod("setOffAge",int.class).invoke(item,2);c.getMethod("setOffAgeMax",int.class).invoke(item,4);c.getMethod("setCooked",boolean.class).invoke(item,freshness.equals("cooked"));c.getMethod("setBurnt",boolean.class).invoke(item,freshness.equals("burnt"));c.getMethod("setBaseHunger",float.class).invoke(item,base);ItemUseProbe.set(ic,item,"uses",3);
   for(int i=0;i<fields.length;i++)c.getMethod("set"+fields[i],float.class).invoke(item,i==0?base*portion:(i+1)*.137f);
   for(String field:new String[]{"FluReduction","FoodSicknessChange","PoisonPower"})c.getMethod("set"+field,int.class).invoke(item,7);
   Map<String,Object>row=new LinkedHashMap<>();row.put("freshness",freshness);row.put("base",base);row.put("portion",portion);row.put("requested",requested);row.put("before",c.getMethod("getCurrentUses").invoke(item));row.put("max",c.getMethod("getMaxUses").invoke(item));
   c.getMethod("setCurrentUses",int.class).invoke(item,requested);row.put("after",c.getMethod("getCurrentUses").invoke(item));List<Integer>bits=new ArrayList<>();for(String getter:getters)bits.add(Float.floatToIntBits((Float)c.getMethod(getter).invoke(item)));row.put("bits",bits);for(String field:new String[]{"FluReduction","FoodSicknessChange","PoisonPower"})row.put(field,c.getMethod("get"+field).invoke(item));System.out.println(RecipeLoadProbe.json(row));
  }
 }
}
