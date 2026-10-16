import java.lang.reflect.*;
import java.util.*;
// Installed component methods on an isolated actor. Does not run a game world.
public class LiteratureCooldownProbe {
 public static void main(String[] args)throws Exception{
  Class<?> u=Class.forName("sun.misc.Unsafe");Field f=u.getDeclaredField("theUnsafe");f.setAccessible(true);
  Class<?> chr=Class.forName("zombie.characters.IsoGameCharacter");
  Object actor=u.getMethod("allocateInstance",Class.class).invoke(f.get(null),Class.forName("zombie.characters.IsoSurvivor"));
  Field memory=chr.getDeclaredField("readLiterature");memory.setAccessible(true);HashMap<String,Integer> map=new HashMap<>();memory.set(actor,map);
  Class<?> fs=Class.forName("zombie.ZomboidFileSystem");Object filesystem=fs.getField("instance").get(null);
  fs.getMethod("setCacheDir",String.class).invoke(filesystem,args[0]);fs.getMethod("init").invoke(filesystem);
  Class<?> lua=Class.forName("zombie.Lua.LuaManager"),pc=Class.forName("se.krka.kahlua.j2se.J2SEPlatform"),platform=Class.forName("se.krka.kahlua.vm.Platform"),table=Class.forName("se.krka.kahlua.vm.KahluaTable"),thread=Class.forName("se.krka.kahlua.vm.KahluaThread");
  Object p=pc.getMethod("getInstance").invoke(null),env=pc.getMethod("newEnvironment").invoke(p),t=thread.getConstructor(platform,table).newInstance(p,env);
  thread.getField("debugOwnerThread").set(t,Thread.currentThread());
  lua.getField("env").set(null,env);lua.getField("thread").set(null,t);
  Class<?> time=Class.forName("zombie.GameTime"),sandbox=Class.forName("zombie.SandboxOptions");
  Object clock=time.getMethod("getInstance").invoke(null),options=sandbox.getMethod("getInstance").invoke(null),cooldown=sandbox.getField("literatureCooldown").get(options);
  System.out.println("defaultCooldown="+cooldown.getClass().getMethod("getValue").invoke(cooldown));
  Method read=chr.getMethod("isLiteratureRead",String.class),add=chr.getMethod("addReadLiterature",String.class),addDay=chr.getMethod("addReadLiterature",String.class,int.class);
  System.out.println("cooldown,stored,now,before,afterAdd,afterExplicit,otherTitle");
  for(int days:new int[]{0,1,7,30})for(int stored:new int[]{0,10,Integer.MAX_VALUE-2})for(int offset:new int[]{-1,0,1}){
   cooldown.getClass().getMethod("setValue",int.class).invoke(cooldown,days);
   int actual=(int)cooldown.getClass().getMethod("getValue").invoke(cooldown),now=stored+actual+offset;
   time.getMethod("setNightsSurvived",int.class).invoke(clock,now);map.clear();map.put("issue190",stored);
   boolean before=(boolean)read.invoke(actor,"issue190");add.invoke(actor,"issue190");int after=map.get("issue190");addDay.invoke(actor,"issue190",123);
   System.out.println(actual+","+stored+","+now+","+before+","+after+","+map.get("issue190")+","+read.invoke(actor,"issue191"));
  }
 }
}
