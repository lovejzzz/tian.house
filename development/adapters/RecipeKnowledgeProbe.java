import java.lang.reflect.*;import java.util.*;
// Executes installed knowledge overloads on fixture recipes, not crafting actions.
public class RecipeKnowledgeProbe {
 static void field(Class<?> c,Object o,String n,Object v)throws Exception {Field f=c.getDeclaredField(n);f.setAccessible(true);f.set(o,v);}
 public static void main(String[] args)throws Exception {
  Class<?> fs=Class.forName("zombie.ZomboidFileSystem");Object filesystem=fs.getField("instance").get(null);
  fs.getMethod("setCacheDir",String.class).invoke(filesystem,args[0]);fs.getMethod("init").invoke(filesystem);
  Class<?> lua=Class.forName("zombie.Lua.LuaManager"),pc=Class.forName("se.krka.kahlua.j2se.J2SEPlatform"),platform=Class.forName("se.krka.kahlua.vm.Platform"),table=Class.forName("se.krka.kahlua.vm.KahluaTable"),thread=Class.forName("se.krka.kahlua.vm.KahluaThread");
  Object p=pc.getMethod("getInstance").invoke(null),env=pc.getMethod("newEnvironment").invoke(p),t=thread.getConstructor(platform,table).newInstance(p,env);
  thread.getField("debugOwnerThread").set(t,Thread.currentThread());
  lua.getField("env").set(null,env);lua.getField("thread").set(null,t);

  Class.forName("zombie.core.Core").getField("debug").setBoolean(null,true);
  Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);Method alloc=u.getMethod("allocateInstance",Class.class);
  Class<?> chr=Class.forName("zombie.characters.IsoGameCharacter"),recipe=Class.forName("zombie.scripting.entity.components.crafting.CraftRecipe");
  Object actor=alloc.invoke(uf.get(null),Class.forName("zombie.characters.IsoSurvivor")),r=alloc.invoke(uf.get(null),recipe);
  field(recipe,r,"name","MakeFixture");field(recipe,r,"translationName","FixtureDisplay");field(recipe,r,"metaRecipe","base:fixturegroup");
  List<String> known=new ArrayList<>();field(chr,actor,"knownRecipes",known);
  Object cheats=Class.forName("zombie.characters.PlayerCheats").getConstructor().newInstance();chr.getField("cheats").set(actor,cheats);
  Class<?> cheatType=Class.forName("zombie.characters.CheatType");Object flag=cheatType.getField("KNOW_ALL_RECIPES").get(null);Method setCheat=cheats.getClass().getMethod("set",cheatType,boolean.class);
  Class<?> sandbox=Class.forName("zombie.SandboxOptions");Object options=sandbox.getMethod("getInstance").invoke(null),visible=sandbox.getField("seeNotLearntRecipe").get(options);
  Method setVisible=visible.getClass().getMethod("setValue",boolean.class),check=chr.getMethod("isRecipeKnown",recipe,boolean.class);
  System.out.println("needLearn\tseeUnlearned\tknowAll\tmemory\tvisibleKnown\tactuallyKnown");
  for(boolean need:new boolean[]{false,true})for(boolean see:new boolean[]{false,true})for(boolean all:new boolean[]{false,true})for(String memory:new String[]{"none","MakeFixture","FixtureDisplay","base:fixturegroup","makefixture"}){
   field(recipe,r,"needToBeLearn",need);setVisible.invoke(visible,see);setCheat.invoke(cheats,flag,all);known.clear();if(!memory.equals("none"))known.add(memory);
   if(!visible.getClass().getMethod("getValue").invoke(visible).equals(see)||!chr.getMethod("isKnowAllRecipes").invoke(actor).equals(all))throw new IllegalStateException("Fixture configuration readback failed");
   System.out.println(need+"\t"+see+"\t"+all+"\t"+memory+"\t"+check.invoke(actor,r,false)+"\t"+check.invoke(actor,r,true));
  }
 }
}
