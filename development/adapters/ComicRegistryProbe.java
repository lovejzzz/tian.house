import java.lang.reflect.*;
import java.util.*;
// Reads the actual installed registry after static initialization; no game UI.
public class ComicRegistryProbe {
 public static void main(String[] args)throws Exception{
  Class<?> type=Class.forName("zombie.scripting.objects.ComicBook"),registries=Class.forName("zombie.scripting.objects.Registries");
  Object registry=registries.getField("COMIC_BOOK").get(null);
  System.out.println("key\tissues\tinPrint");
  for(Object comic:(List<?>)registry.getClass().getMethod("values").invoke(registry))System.out.println(type.getMethod("getTranslationKey").invoke(comic)+"\t"+type.getMethod("getIssues").invoke(comic)+"\t"+type.getMethod("isInPrint").invoke(comic));
 }
}
