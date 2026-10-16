import java.lang.reflect.*;
// Runs native Literature getters, Stats.add and BodyDamage.JustReadSomething.
// Excludes ReadLiterature's recipe/consumption branches and application workflow.
public class LiteratureEffectsProbe {
 public static void main(String[] args)throws Exception{
  Class<?> u=Class.forName("sun.misc.Unsafe");Field f=u.getDeclaredField("theUnsafe");f.setAccessible(true);Object allocator=f.get(null);Method allocate=u.getMethod("allocateInstance",Class.class);
  Class<?> lit=Class.forName("zombie.inventory.types.Literature"),statsClass=Class.forName("zombie.characters.Stats"),stat=Class.forName("zombie.characters.CharacterStat"),bodyClass=Class.forName("zombie.characters.BodyDamage.BodyDamage");
  Object item=allocate.invoke(allocator,lit),body=allocate.invoke(allocator,bodyClass),stats=statsClass.getConstructor().newInstance();
  Field sf=bodyClass.getDeclaredField("stats");sf.setAccessible(true);sf.set(body,stats);
  lit.getMethod("setStressChange",float.class).invoke(item,-20f/100f);lit.getMethod("setBoredomChange",float.class).invoke(item,-30f);lit.getMethod("setUnhappyChange",float.class).invoke(item,-20f);
  Object stress=stat.getField("STRESS").get(null),bored=stat.getField("BOREDOM").get(null),unhappy=stat.getField("UNHAPPINESS").get(null);
  Method set=statsClass.getMethod("set",stat,float.class),get=statsClass.getMethod("get",stat),add=statsClass.getMethod("add",stat,float.class);
  System.out.println("initialStress,initialBoredom,initialUnhappiness,alreadyRead,stress,boredom,unhappiness");
  for(boolean read:new boolean[]{false,true})for(float[] initial:new float[][]{{.8f,50,50},{.1f,10,10},{0,0,0},{1,100,100}}){
   set.invoke(stats,stress,initial[0]);set.invoke(stats,bored,initial[1]);set.invoke(stats,unhappy,initial[2]);lit.getField("alreadyRead").set(item,read);
   add.invoke(stats,stress,lit.getMethod("getStressChange").invoke(item));bodyClass.getMethod("JustReadSomething",lit).invoke(body,item);
   System.out.println(initial[0]+","+initial[1]+","+initial[2]+","+read+","+get.invoke(stats,stress)+","+get.invoke(stats,bored)+","+get.invoke(stats,unhappy));
  }
 }
}
