import java.lang.reflect.*;
import java.util.*;

// Direct installed getter calls on minimally populated objects; excludes actor
// construction, world state, crafting, and animation rendering.
public class MaintenanceProbe {
 public static void main(String[] args)throws Exception{
  Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);Object allocator=uf.get(null);
  Method allocate=u.getMethod("allocateInstance",Class.class);
  Class<?> rand=Class.forName("zombie.core.random.RandStandard");Field rf=rand.getSuperclass().getDeclaredField("rand");rf.setAccessible(true);rf.set(rand.getField("INSTANCE").get(null),new Random(1));
  Class<?> chr=Class.forName("zombie.characters.IsoGameCharacter"),weapon=Class.forName("zombie.inventory.types.HandWeapon"),perk=Class.forName("zombie.characters.skills.PerkFactory$Perk"),perks=Class.forName("zombie.characters.skills.PerkFactory$Perks"),category=Class.forName("zombie.scripting.objects.WeaponCategory");
  Object actor=allocate.invoke(allocator,Class.forName("zombie.characters.IsoSurvivor"));
  WeaponModelProbe.set(actor,"perkList",new ArrayList<>());
  WeaponModelProbe.set(actor,"gameVariables",Class.forName("zombie.core.skinnedmodel.advancedanimation.AnimationVariableSource").getConstructor().newInstance());
  Object tool=allocate.invoke(allocator,weapon),held=allocate.invoke(allocator,weapon);
  Object script=allocate.invoke(allocator,Class.forName("zombie.scripting.objects.Item"));
  WeaponModelProbe.set(script,"swingAnim","Bat");WeaponModelProbe.set(held,"scriptItem",script);WeaponModelProbe.set(tool,"scriptItem",script);
  WeaponModelProbe.set(tool,"weaponCategories",new HashSet<>(Arrays.asList(category.getField("SMALL_BLUNT").get(null))));
  chr.getMethod("setPerkLevelDebug",perk,int.class).invoke(actor,perks.getField("Maintenance").get(null),3);
  String[][] cases={{"NONE","0"},{"SMALL_BLUNT","0"},{"SMALL_BLUNT","1"},{"SMALL_BLUNT","2"},{"SMALL_BLUNT","3"},{"SMALL_BLUNT","10"},{"BLUNT","4"},{"AXE","4"},{"AXE,SMALL_BLUNT","8"}};
  System.out.println("heldCategories,level,weaponLevel,maintenance");
  for(String[] c:cases){int level=Integer.parseInt(c[1]);
   for(String name:new String[]{"Axe","Spear","SmallBlade","LongBlade","Blunt","SmallBlunt"})chr.getMethod("setPerkLevelDebug",perk,int.class).invoke(actor,perks.getField(name).get(null),level);
   Set<Object> cats=new HashSet<>();if(!c[0].equals("NONE"))for(String name:c[0].split(","))cats.add(category.getField(name).get(null));
   WeaponModelProbe.set(held,"weaponCategories",cats);WeaponModelProbe.set(actor,"leftHandItem",c[0].equals("NONE")?null:held);
   System.out.println(c[0].replace(',','+')+","+level+","+chr.getMethod("getWeaponLevel",weapon).invoke(actor,tool)+","+weapon.getMethod("getMaintenanceMod",chr).invoke(tool,actor));
  }
 }
}
