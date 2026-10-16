import java.lang.reflect.*;
public class BoneWeightProbe {
 public static void main(String[] args)throws Exception{
  Class<?> spec=Class.forName("zombie.core.skinnedmodel.advancedanimation.AnimBoneWeight");Object defaults=spec.getConstructor().newInstance();
  System.out.println("defaults,"+spec.getField("weight").get(defaults)+","+spec.getField("includeDescendants").get(defaults));
  Class<?> u=Class.forName("sun.misc.Unsafe");Field f=u.getDeclaredField("theUnsafe");f.setAccessible(true);
  Class<?> track=Class.forName("zombie.core.skinnedmodel.animation.AnimationTrack"),pool=Class.forName("zombie.util.PooledFloatArrayObject");
  Object t=u.getMethod("allocateInstance",Class.class).invoke(f.get(null),track),array=pool.getMethod("alloc",int.class).invoke(null,1);
  Field a=track.getDeclaredField("boneWeights");a.setAccessible(true);a.set(t,array);
  Method assign=track.getDeclaredMethod("assignBoneWeight",float.class,int.class);assign.setAccessible(true);
  pool.getMethod("set",int.class,float.class).invoke(array,0,0f);
  for(float weight:new float[]{.8f,.2f,-1f,2f}){
   assign.invoke(t,weight,0);System.out.println(weight+","+pool.getMethod("get",int.class).invoke(array,0));
  }
 }
}
