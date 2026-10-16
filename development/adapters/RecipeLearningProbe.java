import java.lang.reflect.*;
import java.util.*;
// Isolated installed learnRecipe calls. Empty ScriptManager: no recipe definitions
// or meta-recipe expansion; this only establishes identifier-memory semantics.
public class RecipeLearningProbe {
 public static void main(String[] args)throws Exception {
  Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);
  Class<?> c=Class.forName("zombie.characters.IsoGameCharacter");Object actor=u.getMethod("allocateInstance",Class.class).invoke(uf.get(null),Class.forName("zombie.characters.IsoSurvivor"));
  c.getField("cheats").set(actor,Class.forName("zombie.characters.PlayerCheats").getConstructor().newInstance());
  Field f=c.getDeclaredField("knownRecipes");f.setAccessible(true);List<String> known=new ArrayList<>();f.set(actor,known);
  Method learn=c.getMethod("learnRecipe",String.class);
  // Isolated debug-mode flag avoids uninitialized client/server services and
  // permits the native cheat setter. It does not affect the running game.
  Class.forName("zombie.core.Core").getField("debug").setBoolean(null,true);
  Object cheats=c.getField("cheats").get(actor);Class<?> cheatType=Class.forName("zombie.characters.CheatType");Object flag=cheatType.getField("KNOW_ALL_RECIPES").get(null);Method all=cheats.getClass().getMethod("set",cheatType,boolean.class);
  System.out.println("knowAll\tidentifier\tadded\tsize");
  for(boolean knowAll:new boolean[]{false,true}){known.clear();all.invoke(cheats,flag,knowAll);if((Boolean)c.getMethod("isKnowAllRecipes").invoke(actor)!=knowAll)throw new IllegalStateException("cheat setter rejected");for(String name:new String[]{"Generator","Generator","generator"," Generator ","base:kitchentools","","__proto__"}){
   System.out.println(knowAll+"\t"+name+"\t"+learn.invoke(actor,name)+"\t"+known.size());
  }}
 }
}
