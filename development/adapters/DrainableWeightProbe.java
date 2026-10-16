import java.lang.reflect.*;import java.util.*;
public class DrainableWeightProbe {
 @SuppressWarnings("unchecked") public static void main(String[]args)throws Exception{
  RecipeLoadProbe.main(new String[]{args[0]});Class<?> rand=Class.forName("zombie.core.random.RandStandard");rand.getMethod("init").invoke(rand.getField("INSTANCE").get(null));
  Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);Method alloc=u.getMethod("allocateInstance",Class.class);
  Class<?> ic=Class.forName("zombie.inventory.InventoryItem"),dc=Class.forName("zombie.inventory.types.DrainableComboItem"),sc=Class.forName("zombie.scripting.objects.Item"),mc=Class.forName("zombie.scripting.objects.ScriptModule"),smc=Class.forName("zombie.scripting.ScriptManager");
  Object manager=smc.getField("instance").get(null),module=mc.getConstructor().newInstance();mc.getField("name").set(module,"WeightProbe");((Map<String,Object>)smc.getField("moduleMap").get(manager)).put("WeightProbe",module);
  Field collectionField=smc.getDeclaredField("items");collectionField.setAccessible(true);Object collection=collectionField.get(manager);Class<?> bc=Class.forName("zombie.scripting.ScriptBucketCollection");bc.getMethod("registerModule",mc).invoke(collection,module);
  Object bucket=mc.getField("items").get(module);Map<String,Object> scripts=(Map<String,Object>)Class.forName("zombie.scripting.ScriptBucket").getMethod("getScriptMap").invoke(bucket);
  Object empty=sc.getConstructor().newInstance();sc.getMethod("setActualWeight",float.class).invoke(empty,.25f);scripts.put("Empty",empty);if(smc.getMethod("getItem",String.class).invoke(manager,"WeightProbe.Empty")!=empty)throw new AssertionError("Registry fixture not resolved");
  for(String mode:new String[]{"none","missing","resolved"})for(float full:new float[]{1f,10f})for(float emptyWeight:new float[]{0f,.1f,2f})for(float delta:new float[]{.2f,.3f})for(int uses:new int[]{-1,0,1,3,5,7}){
   Object item=alloc.invoke(uf.get(null),dc),script=sc.getConstructor().newInstance();sc.getMethod("setActualWeight",float.class).invoke(script,full);ItemUseProbe.set(ic,item,"scriptItem",script);ItemUseProbe.set(ic,item,"name","Weight fixture");ItemUseProbe.set(ic,item,"fullType","WeightProbe.Full");ItemUseProbe.set(ic,item,"actualWeight",7.25f);ItemUseProbe.set(ic,item,"weight",6.25f);ItemUseProbe.set(ic,item,"uses",uses);ItemUseProbe.set(dc,item,"useDelta",delta);ItemUseProbe.set(dc,item,"weightEmpty",emptyWeight);
   if(!mode.equals("none")){ItemUseProbe.set(dc,item,"replaceOnDeplete",mode.equals("resolved")?"Empty":"Missing");ItemUseProbe.set(dc,item,"replaceOnDepleteFullType",mode.equals("resolved")?"WeightProbe.Empty":"WeightProbe.Missing");}
   dc.getMethod("updateWeight").invoke(item);Map<String,Object>row=new LinkedHashMap<>();row.put("mode",mode);row.put("full",full);row.put("emptyWeight",emptyWeight);row.put("delta",delta);row.put("uses",uses);row.put("actualBits",Float.floatToIntBits((Float)ic.getMethod("getActualWeight").invoke(item)));row.put("weightBits",Float.floatToIntBits((Float)ic.getMethod("getWeight").invoke(item)));row.put("custom",ic.getMethod("isCustomWeight").invoke(item));System.out.println(RecipeLoadProbe.json(row));
  }
 }
}
