// Installed Jassimp with the exact loadX post-process flags. Component only.
import java.lang.reflect.*;import java.nio.file.*;import java.util.*;
public class MeshHandednessProbe {
 @SuppressWarnings({"unchecked","rawtypes"}) public static void main(String[] args)throws Exception{
  Class<?> flags=Class.forName("jassimp.AiPostProcessSteps");Set steps=EnumSet.noneOf((Class)flags);
  for(String flag:new String[]{"FIND_INSTANCES","MAKE_LEFT_HANDED","LIMIT_BONE_WEIGHTS","TRIANGULATE","OPTIMIZE_MESHES","REMOVE_REDUNDANT_MATERIALS","JOIN_IDENTICAL_VERTICES"})steps.add(flags.getField(flag).get(null));
  Object scene=Class.forName("jassimp.Jassimp").getMethod("importFile",String.class,Set.class).invoke(null,args[0],steps);
  List<?> meshes=(List<?>)scene.getClass().getMethod("getMeshes").invoke(scene);StringBuilder out=new StringBuilder("mesh\tvertex\tx\ty\tz\n");
  for(int m=0;m<meshes.size();m++){Object mesh=meshes.get(m);Class<?> c=mesh.getClass();int n=(Integer)c.getMethod("getNumVertices").invoke(mesh);for(int i=0;i<n;i++)out.append(m+"\t"+i+"\t"+c.getMethod("getPositionX",int.class).invoke(mesh,i)+"\t"+c.getMethod("getPositionY",int.class).invoke(mesh,i)+"\t"+c.getMethod("getPositionZ",int.class).invoke(mesh,i)+"\n");}
  Files.writeString(Path.of(args[1]),out,StandardOpenOption.CREATE_NEW);
 }
}
