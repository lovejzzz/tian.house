// Executes the installed square predicate; not a source-game roof rebuild.
import java.lang.reflect.*;
import java.nio.file.*;
public class RainBlockingProbe {
 public static void main(String[] args)throws Exception{
  Class<?> sq=Class.forName("zombie.iso.IsoGridSquare"),cell=Class.forName("zombie.iso.IsoCell"),slice=Class.forName("zombie.iso.SliceY"),flag=Class.forName("zombie.iso.SpriteDetails.IsoFlagType");
  Constructor<?> ctor=sq.getConstructor(cell,slice,int.class,int.class,int.class);
  StringBuilder out=new StringBuilder("solidfloor\tBlockRain\tblocks\n");
  for(boolean floor:new boolean[]{false,true})for(boolean rain:new boolean[]{false,true}){
   Object square=ctor.newInstance(null,null,3,3,1),props=sq.getMethod("getProperties").invoke(square);
   Method set=props.getClass().getMethod("set",flag),has=props.getClass().getMethod("has",flag);
   Object f=flag.getField("solidfloor").get(null),r=flag.getField("BlockRain").get(null);
   if(floor)set.invoke(props,f);if(rain)set.invoke(props,r);
   if((Boolean)has.invoke(props,f)!=floor||(Boolean)has.invoke(props,r)!=rain)throw new IllegalStateException("Invalid fixture flags");
   out.append(floor+"\t"+rain+"\t"+sq.getMethod("hasRainBlockingTile").invoke(square)+"\n");
  }
  Files.writeString(Path.of(args[0]),out,StandardOpenOption.CREATE_NEW);
 }
}
