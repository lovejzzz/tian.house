// Runs an unchanged source Lua module plus an explicit component fixture.
// The fixture supplies its dependencies; this does not boot the source game.
import java.lang.reflect.*;import java.nio.file.*;
public class SourceLuaProbe {
 public static void main(String[] args)throws Exception{
  Class<?> pc=Class.forName("se.krka.kahlua.j2se.J2SEPlatform"),platform=Class.forName("se.krka.kahlua.vm.Platform"),table=Class.forName("se.krka.kahlua.vm.KahluaTable"),thread=Class.forName("se.krka.kahlua.vm.KahluaThread");
  Object p=pc.getMethod("getInstance").invoke(null),env=pc.getMethod("newEnvironment").invoke(p),t=thread.getConstructor(platform,table).newInstance(p,env);
  Method compile=Class.forName("se.krka.kahlua.luaj.compiler.LuaCompiler").getMethod("loadstring",String.class,String.class,table),call=thread.getMethod("call",Object.class,Object[].class);
  for(int i=0;i<2;i++){Object closure=compile.invoke(null,Files.readString(Path.of(args[i])),args[i],env);Object result=call.invoke(t,closure,new Object[0]);if(i==1)Files.writeString(Path.of(args[2]),String.valueOf(result),StandardOpenOption.CREATE_NEW);}
 }
}
