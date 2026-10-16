import java.lang.reflect.*;
import java.util.*;

// Read-only installed Jassimp loader probe; outputs raw mesh data after the
// default FBX postprocess flags. Does not initialize graphics or modify saves.
public class StaticFbxProbe {
 static Object call(Object o,String name,Class<?>[] types,Object... args)throws Exception{return o.getClass().getMethod(name,types).invoke(o,args);}
 static void nodes(Object node,Object provider,List<String> rows)throws Exception{
  Object matrix=call(node,"getTransform",new Class<?>[]{Class.forName("jassimp.AiWrapperProvider")},provider);
  List<Float> values=new ArrayList<>();for(int r=0;r<4;r++)for(int c=0;c<4;c++)values.add((float)call(matrix,"get",new Class<?>[]{int.class,int.class},r,c));
  String name=(String)call(node,"getName",new Class<?>[]{});
  Object parent=call(node,"getParent",new Class<?>[]{});String parentName=parent==null?null:(String)call(parent,"getName",new Class<?>[]{});
  rows.add("{\"name\":"+quote(name)+",\"parent\":"+quote(parentName)+",\"meshes\":"+Arrays.toString((int[])call(node,"getMeshes",new Class<?>[]{}))+",\"transformation\":"+values+"}");
  for(Object child:(List<?>)call(node,"getChildren",new Class<?>[]{}))nodes(child,provider,rows);
 }
 static String quote(String s){return s==null?"null":"\""+s.replace("\\","\\\\").replace("\"","\\\"")+"\"";}
 public static void main(String[] args)throws Exception{
  Class<?> step=Class.forName("jassimp.AiPostProcessSteps");Set<Object> flags=new HashSet<>();
  for(String n:new String[]{"FIND_INSTANCES","MAKE_LEFT_HANDED","LIMIT_BONE_WEIGHTS","TRIANGULATE","OPTIMIZE_MESHES","REMOVE_REDUNDANT_MATERIALS","JOIN_IDENTICAL_VERTICES"})flags.add(step.getField(n).get(null));
  Object scene=Class.forName("jassimp.Jassimp").getMethod("importFile",String.class,Set.class).invoke(null,args[0],flags);
  List<?> meshes=(List<?>)call(scene,"getMeshes",new Class<?>[]{});StringJoiner output=new StringJoiner(",","[","]");
  for(Object mesh:meshes){
   int count=(int)call(mesh,"getNumVertices",new Class<?>[]{}),faces=(int)call(mesh,"getNumFaces",new Class<?>[]{});
   List<Float> vertices=new ArrayList<>(),uvs=new ArrayList<>();List<Integer> indices=new ArrayList<>();
   boolean uv=(boolean)call(mesh,"hasTexCoords",new Class<?>[]{int.class},0);
   for(int i=0;i<count;i++){
    for(String axis:new String[]{"X","Y","Z"})vertices.add((float)call(mesh,"getPosition"+axis,new Class<?>[]{int.class},i));
    if(uv)for(String axis:new String[]{"U","V"})uvs.add((float)call(mesh,"getTexCoord"+axis,new Class<?>[]{int.class,int.class},i,0));
   }
   for(int f=0;f<faces;f++)for(int j=0;j<3;j++)indices.add((int)call(mesh,"getFaceVertex",new Class<?>[]{int.class,int.class},f,j));
   output.add("{\"vertices\":"+vertices+",\"uvs\":"+uvs+",\"indices\":"+indices+"}");
  }
  Object provider=Class.forName("jassimp.AiBuiltInWrapperProvider").getConstructor().newInstance();
  Object root=call(scene,"getSceneRoot",new Class<?>[]{Class.forName("jassimp.AiWrapperProvider")},provider);
  List<String> rows=new ArrayList<>();nodes(root,provider,rows);
  System.out.println("{\"meshes\":"+output+",\"nodes\":["+String.join(",",rows)+"]}");
 }
}
