import java.lang.reflect.*;import java.util.*;
public class PartialCraftItemProbe {
 public static void main(String[]args)throws Exception{
  RecipeLoadProbe.main(new String[]{args[0]});
  Class<?> rc=Class.forName("zombie.scripting.entity.components.crafting.CraftRecipe"),mc=Class.forName("zombie.scripting.objects.ScriptModule"),ic=Class.forName("zombie.scripting.entity.components.crafting.InputScript"),itemClass=Class.forName("zombie.scripting.objects.Item"),typeClass=Class.forName("zombie.scripting.objects.ItemType");
  Object recipe=rc.getConstructor().newInstance(),module=mc.getConstructor().newInstance();mc.getField("name").set(module,"Base");rc.getMethod("setModule",mc).invoke(recipe,module);
  Field mod=Class.forName("zombie.scripting.ScriptManager").getDeclaredField("currentLoadFileMod");mod.setAccessible(true);mod.set(null,"pz-vanilla");rc.getMethod("InitLoadPP",String.class).invoke(recipe,"Fixture");
  Method load=ic.getDeclaredMethod("Load",rc,String.class);load.setAccessible(true);
  for(String mode:new String[]{"use","keep","destroy"})for(boolean count:new boolean[]{false,true}){
   Object input=load.invoke(null,recipe,"item 1 [Base.Fixture] mode:"+mode+(count?" flags[ItemCount]":""));
   for(String type:new String[]{"DRAINABLE","FOOD","NORMAL"})for(float value:new float[]{-20f,-1.0001f,-1f,0f,.99999999f,1f,1.0001f,20f}){
    Object item=itemClass.getConstructor().newInstance();itemClass.getMethod("setItemType",typeClass).invoke(item,typeClass.getField(type).get(null));itemClass.getField("hungerChange").setFloat(item,value);itemClass.getField("useDelta").setFloat(item,value);
    Map<String,Object> row=new LinkedHashMap<>();row.put("mode",mode);row.put("count",count);row.put("type",type);row.put("value",value);row.put("partial",ic.getMethod("isUsesPartialItem",itemClass).invoke(input,item));System.out.println(RecipeLoadProbe.json(row));
   }
  }
 }
}
