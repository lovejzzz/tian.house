// Installed PerkFactory initialization and threshold getters; no XP actor lifecycle.
public class PerkThresholdProbe {
 public static void main(String[] args)throws Exception {
  Class<?> factory=Class.forName("zombie.characters.skills.PerkFactory");
  factory.getMethod("init").invoke(null);
  Object wood=Class.forName("zombie.characters.skills.PerkFactory$Perks").getField("Woodwork").get(null);
  System.out.println("level,totalXp");
  for(int level=0;level<=10;level++)System.out.println(level+","+wood.getClass().getMethod("getTotalXpForLevel",int.class).invoke(wood,level));
 }
}
