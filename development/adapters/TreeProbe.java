// Source-component adapter: executes local noise/RNG, never initializes a world.
// Inferred initial tree state is not a capture of source-rendered vegetation.
import java.lang.reflect.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
public class TreeProbe {
 static Object field(Object obj,String name)throws Exception{Class<?> c=obj instanceof Class<?>?(Class<?>)obj:obj.getClass();Field f=c.getDeclaredField(name);f.setAccessible(true);return f.get(obj instanceof Class<?>?null:obj);}
 static Class<?> noiseClass;static Method sample;
 static Object noise(Properties cfg,String prefix,float[] weights)throws Exception{Object n=noiseClass.getConstructor().newInstance();Method add=noiseClass.getMethod("addLayer",int.class,float.class,float.class);float[] scales={3,5,8};for(int i=0;i<3;i++)add.invoke(n,Integer.parseInt(cfg.getProperty("seeds.seed"+prefix+"_"+i).trim()),weights[i],scales[i]);return n;}
 static float value(Object n,float x,float y)throws Exception{return (Float)sample.invoke(n,x,y);}
 public static void main(String[]args)throws Exception{
  Properties cfg=new Properties();try(Reader in=Files.newBufferedReader(Path.of(args[0]))){cfg.load(in);}
  Object trees=Class.forName("zombie.erosion.categories.NatureTrees").getConstructor().newInstance();int[][] soils=(int[][])field(trees,"soilRef");Object[] species=(Object[])field(trees,"trees");
  int[][] soilTable=(int[][])field(Class.forName("zombie.erosion.ErosionMain"),"soilTable");
  noiseClass=Class.forName("zombie.erosion.utils.Noise2D");sample=noiseClass.getMethod("layeredNoise",float.class,float.class);
  Object main=noise(cfg,"Main",new float[]{.5f,2,5}),moisture=noise(cfg,"Moisture",new float[]{2,1.6f,.6f}),minerals=noise(cfg,"Minerals",new float[]{2,1.6f,.6f});
  Class<?> rc=Class.forName("zombie.core.random.RandLocation");Constructor<?> ctor=rc.getConstructor(int.class,int.class);Method next=rc.getMethod("Next",int.class);
  try(BufferedReader in=Files.newBufferedReader(Path.of(args[1]));PrintWriter out=new PrintWriter(Files.newBufferedWriter(Path.of(args[2]),StandardOpenOption.CREATE_NEW))){String line;
   while((line=in.readLine())!=null){String[] cols=line.split("\\t");int x=Integer.parseInt(cols[0]),y=Integer.parseInt(cols[1]);String placeholder=cols[2];
    float cx=(x/8)/5f,cy=(y/8)/5f;int m=Math.min(9,(int)Math.floor(value(moisture,cx,cy)*10)),v=Math.min(9,(int)Math.floor(value(minerals,cx,cy)*10));int soil=soilTable[m][v]-1;
    Object rng=ctor.newInstance(x,y);next.invoke(rng,100);
    if(soil<0||soil>=soils.length)soil=(Integer)next.invoke(rng,soils.length);
    int tree=soils[soil][(Integer)next.invoke(rng,soils[soil].length)]-1;
    int noise=(int)Math.floor(value(main,x/10f,y/10f)*100),stage=(placeholder.startsWith("jumbo_tree")?4:2)+(int)Math.floor(noise/51f);
    Object spec=species[tree];out.println(x+"\t"+y+"\t"+placeholder+"\t"+field(spec,"tilesetName")+"\t"+field(spec,"evergreen")+"\t"+stage+"\t"+soil+"\t"+noise);
   }
  }
 }
}
