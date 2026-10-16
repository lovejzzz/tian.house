import java.lang.reflect.*;import java.nio.file.*;import java.util.*;
// Installed private nameComicBook, actual registry, injected RNG boundary values
// and installed EN translations. Not the full item-creation workflow.
public class ComicNameProbe {
 static class Fixed extends Random {int value; Fixed(int n){value=n;} public int nextInt(int bound){return Math.min(value,bound-1);}}
 public static void main(String[] args)throws Exception{
  Class<?> tr=Class.forName("zombie.core.Translator");Field tf=tr.getDeclaredField("igui");tf.setAccessible(true);Map<String,String> translations=(Map<String,String>)tf.get(null);
  for(String line:Files.readAllLines(Path.of(args[0]))){String[] v=line.split("\t",2);translations.put(v[0],v[1]);}
  Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);
  Class<?> inv=Class.forName("zombie.inventory.InventoryItem"),lit=Class.forName("zombie.inventory.types.Literature"),comic=Class.forName("zombie.scripting.objects.ComicBook");
  Object item=u.getMethod("allocateInstance",Class.class).invoke(uf.get(null),lit);
  Class<?> rs=Class.forName("zombie.core.random.RandStandard");Field rf=rs.getSuperclass().getDeclaredField("rand");rf.setAccessible(true);
  Object registry=Class.forName("zombie.scripting.objects.Registries").getField("COMIC_BOOK").get(null);
  Method name=Class.forName("zombie.scripting.logic.ItemCodeOnCreate").getDeclaredMethod("nameComicBook",inv,comic);name.setAccessible(true);
  System.out.println("key\tissues\trequestedIssue\tidentity\tdisplay");
  for(Object book:(List<?>)registry.getClass().getMethod("values").invoke(registry))for(int requested:new int[]{0,1,Integer.MAX_VALUE}){
   rf.set(rs.getField("INSTANCE").get(null),new Fixed(requested));inv.getMethod("setName",String.class).invoke(item,"Comic Book");name.invoke(null,item,book);
   Object data=inv.getMethod("getModData").invoke(item);
   Object title=Class.forName("se.krka.kahlua.vm.KahluaTable").getMethod("rawget",Object.class).invoke(data,"literatureTitle");
   System.out.println(comic.getMethod("getTranslationKey").invoke(book)+"\t"+comic.getMethod("getIssues").invoke(book)+"\t"+requested+"\t"+title+"\t"+inv.getMethod("getDisplayName").invoke(item));
  }
 }
}
