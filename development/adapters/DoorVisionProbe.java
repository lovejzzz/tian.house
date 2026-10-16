// Runs original door vision and collision on controlled adjacent square fixtures.
// This is component execution, not a full-game door interaction.
import java.lang.reflect.*;
import java.nio.file.*;
import java.io.*;
public class DoorVisionProbe {
 public static void main(String[] args)throws Exception{
  Class<?> sq=Class.forName("zombie.iso.IsoGridSquare"),cell=Class.forName("zombie.iso.IsoCell"),slice=Class.forName("zombie.iso.SliceY"),door=Class.forName("zombie.iso.objects.IsoDoor"),sprite=Class.forName("zombie.iso.sprite.IsoSprite"),property=Class.forName("zombie.core.properties.IsoPropertyType");
  Constructor<?> squareCtor=sq.getConstructor(cell,slice,int.class,int.class,int.class);
  // A standalone JVM has not loaded the tile-property registry. Register the
  // fixture's property explicitly, then verify it rather than trusting set().
  Class<?> aliases=Class.forName("zombie.core.TilePropertyAliasMap");
  Method register=aliases.getDeclaredMethod("register",property,java.util.ArrayList.class);register.setAccessible(true);
  register.invoke(aliases.getField("instance").get(null),property.getField("DOOR_TRANS").get(null),new java.util.ArrayList<String>(java.util.List.of("")));
  Field curtain=door.getDeclaredField("hasCurtain"),curtainOpen=door.getDeclaredField("curtainOpen");curtain.setAccessible(true);curtainOpen.setAccessible(true);
  try(PrintWriter out=new PrintWriter(Files.newBufferedWriter(Path.of(args[0]),StandardOpenOption.CREATE_NEW))){
   out.println("north\tglass\topen\tcurtain\treverse\tvision\tcollide");
   for(boolean north:new boolean[]{false,true})for(boolean glass:new boolean[]{false,true})for(boolean open:new boolean[]{false,true})for(int c=0;c<3;c++)for(boolean reverse:new boolean[]{false,true}){
    Object own=squareCtor.newInstance(null,null,3,3,0),adj=squareCtor.newInstance(null,null,north?3:2,north?2:3,0),d=door.getConstructor(cell).newInstance(new Object[]{null}),sp=sprite.getConstructor().newInstance();
    door.getField("square").set(d,own);door.getField("sprite").set(d,sp);door.getField("north").setBoolean(d,north);door.getMethod("setOpen",boolean.class).invoke(d,open);
    curtain.setBoolean(d,c>0);curtainOpen.setBoolean(d,c==2);
    if(glass){Object p=sprite.getMethod("getProperties").invoke(sp);p.getClass().getMethod("set",property,String.class).invoke(p,property.getField("DOOR_TRANS").get(null),"");}
    Object props=sprite.getMethod("getProperties").invoke(sp);
    if((Boolean)props.getClass().getMethod("has",property).invoke(props,property.getField("DOOR_TRANS").get(null))!=glass)throw new IllegalStateException("Glass fixture not initialized");
    Object from=reverse?adj:own,to=reverse?own:adj;
    Object vision=door.getMethod("TestVision",sq,sq).invoke(d,from,to);
    Object collide=door.getMethod("TestCollide",Class.forName("zombie.iso.IsoMovingObject"),sq,sq).invoke(d,null,from,to);
    out.println(north+"\t"+glass+"\t"+open+"\t"+c+"\t"+reverse+"\t"+vision+"\t"+collide);
   }
  }
 }
}
