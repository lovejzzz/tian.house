import java.lang.reflect.*;
import java.util.ArrayList;
import java.util.Arrays;

// Isolated installed getter execution. Uninitialized instances receive only the
// getter's fields; this deliberately does not test creation or game rendering.
public class WeaponModelProbe {
 static void set(Object o,String name,Object value)throws Exception{
  for(Class<?> c=o.getClass();c!=null;c=c.getSuperclass()){
   try{Field f=c.getDeclaredField(name);f.setAccessible(true);f.set(o,value);return;}
   catch(NoSuchFieldException ignored){}
  }
  throw new NoSuchFieldException(name);
 }
 public static void main(String[] args)throws Exception{
  Class<?> unsafe=Class.forName("sun.misc.Unsafe");Field field=unsafe.getDeclaredField("theUnsafe");field.setAccessible(true);Object allocator=field.get(null);
  Class<?> weapon=Class.forName("zombie.inventory.types.HandWeapon");
  Object[][] cases={{-1,null,"Hammer",null},{-1,"Override","Hammer",null},{-1,"","Hammer",null},{1,"Override","Hammer",new ArrayList<>(Arrays.asList("First","Second"))},{0,"Override","Hammer",new ArrayList<>(Arrays.asList((String)null))},{0,"Override","Hammer",new ArrayList<>(Arrays.asList(""))},{1,null,"Hammer",null},{3,null,"Hammer",new ArrayList<>(Arrays.asList("First","Second"))}};
  System.out.println("case\tresult");
  for(int i=0;i<cases.length;i++){
   Object o=unsafe.getMethod("allocateInstance",Class.class).invoke(allocator,weapon);Object[] c=cases[i];
   set(o,"modelIndex",c[0]);set(o,"staticModel",c[1]);set(o,"weaponSprite",c[2]);set(o,"weaponSpritesByIndex",c[3]);
   try{Object result=weapon.getMethod("getStaticModel").invoke(o);System.out.println(i+"\t"+(result==null?"<null>":"\""+result+"\""));}
   catch(InvocationTargetException e){System.out.println(i+"\t"+e.getCause().getClass().getSimpleName());}
  }
 }
}
