import java.lang.reflect.*;
import java.util.*;
// Executes installed multiplier storage/getter only, not AddXP or reading.
public class XpMultiplierProbe {
 public static void main(String[] args)throws Exception{
  Class<?> u=Class.forName("sun.misc.Unsafe");Field f=u.getDeclaredField("theUnsafe");f.setAccessible(true);Object allocator=f.get(null);
  Class<?> xp=Class.forName("zombie.characters.IsoGameCharacter$XP"),perk=Class.forName("zombie.characters.skills.PerkFactory$Perk");
  Object instance=u.getMethod("allocateInstance",Class.class).invoke(allocator,xp);
  xp.getField("xpMapMultiplier").set(instance,new HashMap<>());
  Object wood=Class.forName("zombie.characters.skills.PerkFactory$Perks").getField("Woodwork").get(null);
  System.out.println("case,multiplier");
  System.out.println("absent,"+xp.getMethod("getMultiplier",perk).invoke(instance,wood));
  for(int min:new int[]{1,3,9}){
   xp.getMethod("addXpMultiplier",perk,float.class,int.class,int.class).invoke(instance,wood,3f,min,min+1);
   System.out.println("range"+min+","+xp.getMethod("getMultiplier",perk).invoke(instance,wood));
  }
 }
}
