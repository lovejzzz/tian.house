import java.lang.reflect.*;
import java.util.*;

// Installed synchWithVisual on controlled HandWeapon fields; no Item.Instance,
// icon textures, outfit visuals or gameplay initialization are exercised.
public class ModelVariantProbe {
 static class FixedRandom extends Random {
  int draws;
  public int nextInt(int bound){draws++;return bound-1;}
 }
 static ArrayList<String> variants(int count){if(count<0)return null;ArrayList<String> a=new ArrayList<>();for(int i=0;i<count;i++)a.add("Model"+i);return a;}
 public static void main(String[] args)throws Exception{
  Class<?> u=Class.forName("sun.misc.Unsafe");Field uf=u.getDeclaredField("theUnsafe");uf.setAccessible(true);Object allocator=uf.get(null);
  Class<?> weapon=Class.forName("zombie.inventory.types.HandWeapon"),rand=Class.forName("zombie.core.random.RandStandard");
  Field singleton=rand.getDeclaredField("INSTANCE");singleton.setAccessible(true);Object r=singleton.get(null);
  Field randomField=rand.getSuperclass().getDeclaredField("rand");randomField.setAccessible(true);FixedRandom random=new FixedRandom();randomField.set(r,random);
  int[][] cases={{-1,2,-1,-1},{-1,1,4,3},{1,2,-1,-1},{-1,-1,3,5},{-1,-1,4,-1},{-1,-1,-1,2},{-1,-1,-1,-1},{-1,0,-1,-1},{0,-1,3,5}};
  System.out.println("initial,weapon,static,world,result,draws");
  for(int[] c:cases){Object o=u.getMethod("allocateInstance",Class.class).invoke(allocator,weapon);
   WeaponModelProbe.set(o,"modelIndex",c[0]);WeaponModelProbe.set(o,"weaponSpritesByIndex",variants(c[1]));WeaponModelProbe.set(o,"staticModelsByIndex",variants(c[2]));WeaponModelProbe.set(o,"worldStaticModelsByIndex",variants(c[3]));
   int before=random.draws;weapon.getMethod("synchWithVisual").invoke(o);
   System.out.println(c[0]+","+c[1]+","+c[2]+","+c[3]+","+weapon.getMethod("getModelIndex").invoke(o)+","+(random.draws-before));
  }
 }
}
