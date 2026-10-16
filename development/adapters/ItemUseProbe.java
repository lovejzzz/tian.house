import java.lang.reflect.*;import java.util.*;
public class ItemUseProbe {
 static void set(Class<?> c,Object o,String n,Object v)throws Exception{Field f=c.getDeclaredField(n);f.setAccessible(true);f.set(o,v);}
 public static void main(String[]args)throws Exception{
  RecipeLoadProbe.main(new String[]{args[0]});Class<?> rand=Class.forName("zombie.core.random.RandStandard");rand.getMethod("init").invoke(rand.getField("INSTANCE").get(null));Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);Method alloc=u.getMethod("allocateInstance",Class.class);
  Class<?> ic=Class.forName("zombie.inventory.InventoryItem"),cc=Class.forName("zombie.inventory.ItemContainer");Method use=Class.forName("zombie.inventory.ItemUser").getMethod("UseItem",ic,boolean.class,boolean.class,int.class,boolean.class,boolean.class);
  for(int before:new int[]{0,1,3})for(int requested:new int[]{0,1,5})for(boolean keep:new boolean[]{false,true})for(boolean destroy:new boolean[]{false,true})for(boolean keepEmpty:new boolean[]{false,true}){
   Object item=alloc.invoke(uf.get(null),ic),container=alloc.invoke(uf.get(null),cc);ArrayList<Object>items=new ArrayList<>();items.add(item);set(cc,container,"items",items);set(ic,item,"container",container);set(ic,item,"uses",before);Class<?> sc=Class.forName("zombie.scripting.objects.Item");Object script=sc.getConstructor().newInstance();set(sc,script,"disappearOnUse",!keepEmpty);set(ic,item,"scriptItem",script);
   Object used=use.invoke(null,item,true,false,requested,keep,destroy);
   Map<String,Object>row=new LinkedHashMap<>();row.put("before",before);row.put("requested",requested);row.put("keep",keep);row.put("destroy",destroy);row.put("keepEmpty",keepEmpty);row.put("used",used);row.put("after",ic.getMethod("getCurrentUses").invoke(item));row.put("present",items.contains(item));System.out.println(RecipeLoadProbe.json(row));
  }
 }
}
