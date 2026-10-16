import java.lang.reflect.*;import java.nio.file.*;import java.util.*;
// Calls native ScriptParser and CraftRecipe.Load. Not a full ScriptManager load.
public class RecipeLoadProbe {
 static Object call(Object o,String n)throws Exception{return o.getClass().getMethod(n).invoke(o);}
 static Object field(Object o,String n)throws Exception{return o.getClass().getField(n).get(o);}
 static String json(Object o){
  if(o==null)return "null";if(o instanceof Boolean||o instanceof Number)return o.toString();
  if(o instanceof Map<?,?> m){List<String> a=new ArrayList<>();for(var e:m.entrySet())a.add(json(e.getKey())+":"+json(e.getValue()));return "{"+String.join(",",a)+"}";}
  if(o instanceof Collection<?> c){List<String>a=new ArrayList<>();for(Object x:c)a.add(json(x));return "["+String.join(",",a)+"]";}
  return "\""+o.toString().replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r").replace("\t","\\t")+"\"";
 }
 static Map<String,Object> getters(Object o,String... names)throws Exception{Map<String,Object> m=new LinkedHashMap<>();for(String n:names)m.put(n,call(o,n));return m;}
 static void walk(Object block,List<String> parent,Path file)throws Exception{
  String type=(String)field(block,"type"),id=(String)field(block,"id");List<String> path=new ArrayList<>(parent);if(type!=null)path.add(type+(id==null?"":" "+id));
  if("craftRecipe".equals(type)){
   Map<String,Object> row=new LinkedHashMap<>();row.put("file",file.toString());row.put("path",path);
   try{
    Class<?> rc=Class.forName("zombie.scripting.entity.components.crafting.CraftRecipe");Object recipe=rc.getConstructor().newInstance();Class<?> mc=Class.forName("zombie.scripting.objects.ScriptModule");Object module=mc.getConstructor().newInstance();mc.getField("name").set(module,parent.get(0).substring(7));rc.getMethod("setModule",mc).invoke(recipe,module);Field mod=Class.forName("zombie.scripting.ScriptManager").getDeclaredField("currentLoadFileMod");mod.setAccessible(true);mod.set(null,"pz-vanilla");rc.getMethod("InitLoadPP",String.class).invoke(recipe,id);rc.getMethod("Load",String.class,block.getClass()).invoke(recipe,id,block);
    row.put("recipe",getters(recipe,"getName","getTranslationName","needToBeLearn","getTime","getMetaRecipe","getCategory","getTags","isAllowBatchCraft","isCanWalk","getRequiredSkills","getAutoLearnAnySkills","getAutoLearnAllSkills"));
    List<Object> ins=new ArrayList<>();for(Object input:(List<?>)call(recipe,"getInputs"))ins.add(getters(input,"getOriginalLine","getResourceType","getAmount","getMaxAmount","isKeep","isDestroy","isItemCount","getItems","getItemTags","isProp1","isProp2"));row.put("inputs",ins);row.put("loaded",true);
   }catch(Throwable e){Throwable cause=e instanceof InvocationTargetException?e.getCause():e;row.put("loaded",false);row.put("error",cause.toString());}
   System.out.println(json(row));
  }
  for(Object child:(List<?>)field(block,"children"))walk(child,path,file);
 }
 public static void main(String[]args)throws Exception{
  Class<?> fs=Class.forName("zombie.ZomboidFileSystem");Object filesystem=fs.getField("instance").get(null);fs.getMethod("setCacheDir",String.class).invoke(filesystem,args[0]);fs.getMethod("init").invoke(filesystem);
  Class<?> lua=Class.forName("zombie.Lua.LuaManager"),pc=Class.forName("se.krka.kahlua.j2se.J2SEPlatform"),platform=Class.forName("se.krka.kahlua.vm.Platform"),table=Class.forName("se.krka.kahlua.vm.KahluaTable"),thread=Class.forName("se.krka.kahlua.vm.KahluaThread");Object p=pc.getMethod("getInstance").invoke(null),env=pc.getMethod("newEnvironment").invoke(p),t=thread.getConstructor(platform,table).newInstance(p,env);thread.getField("debugOwnerThread").set(t,Thread.currentThread());lua.getField("env").set(null,env);lua.getField("thread").set(null,t);
  Class<?> parser=Class.forName("zombie.scripting.ScriptParser");
  for(int i=1;i<args.length;i++){Path file=Path.of(args[i]);String source=(String)parser.getMethod("stripComments",String.class).invoke(null,Files.readString(file));Object root=parser.getMethod("parse",String.class).invoke(null,source);walk(root,new ArrayList<>(),file);}
 }
}
