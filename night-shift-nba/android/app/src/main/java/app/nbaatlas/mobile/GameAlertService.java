package app.nbaatlas.mobile;
import android.app.*;
import android.app.job.*;
import android.content.*;
import android.os.Build;
import java.io.*;
import java.net.*;
import java.text.SimpleDateFormat;
import java.util.*;
import org.json.*;

public final class GameAlertService extends JobService {
 private static final String CH="nba_games", BASE="https://nba-atlas.vercel.app/api/data?type=scoreboard&date=";
 private static final int PERIODIC=301,NOW=302;
 private volatile Thread worker;
 static void channel(Context c){if(Build.VERSION.SDK_INT>=26)c.getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel(CH,"NBA ATLAS · Αγώνες",NotificationManager.IMPORTANCE_DEFAULT));}
 static void periodic(Context c){JobScheduler s=c.getSystemService(JobScheduler.class);if(s.getPendingJob(PERIODIC)==null)s.schedule(new JobInfo.Builder(PERIODIC,new ComponentName(c,GameAlertService.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true).setPeriodic(900000).build());}
 static void schedule(Context c){periodic(c);c.getSystemService(JobScheduler.class).schedule(new JobInfo.Builder(NOW,new ComponentName(c,GameAlertService.class)).setMinimumLatency(1000).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).build());}
 static void cancel(Context c){JobScheduler s=c.getSystemService(JobScheduler.class);s.cancel(PERIODIC);s.cancel(NOW);}
 @Override public boolean onStartJob(JobParameters p){if(worker!=null&&worker.isAlive())return false;worker=new Thread(()->{boolean retry=false;try{poll();}catch(Exception e){retry=true;}finally{if(!Thread.currentThread().isInterrupted())jobFinished(p,retry);worker=null;}},"atlas-alerts");worker.start();return true;}
 @Override public boolean onStopJob(JobParameters p){Thread t=worker;if(t!=null)t.interrupt();return true;}
 private JSONObject readData(String url)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setConnectTimeout(7000);c.setReadTimeout(7000);try{if(c.getResponseCode()!=200)throw new IOException("HTTP");try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){if(Thread.currentThread().isInterrupted())throw new InterruptedException();out.write(b,0,n);if(out.size()>2000000)throw new IOException("response");}return new JSONObject(out.toString("UTF-8")).getJSONObject("data");}}finally{c.disconnect();}}
 private JSONArray read(String d)throws Exception{return readData(BASE+d).getJSONArray("games");}
 private JSONObject game(String id)throws Exception{return readData("https://nba-atlas.vercel.app/api/data?type=game&id="+id);}
 private long parse(String v){for(String pattern:new String[]{"yyyy-MM-dd'T'HH:mm:ss.SSSXXX","yyyy-MM-dd'T'HH:mm:ssXXX","yyyy-MM-dd'T'HH:mmXXX"})try{return new SimpleDateFormat(pattern,Locale.US).parse(v).getTime();}catch(Exception ignored){}return 0;}
 private boolean send(SharedPreferences p,NotificationManager nm,String id,String kind,String title,String body,long now){
  if(Thread.currentThread().isInterrupted()||!p.getBoolean("enabled",false))return false;
  String key="sent_"+id+"_"+kind;if(p.contains(key))return false;
  Intent open=new Intent(this,MainActivity.class).putExtra("gameId",id).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
  int hash=key.hashCode();PendingIntent pi=PendingIntent.getActivity(this,hash,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CH):new Notification.Builder(this);
  b.setSmallIcon(R.drawable.ic_alert).setContentTitle(title).setContentText(body.replace('\n',' ')).setStyle(new Notification.BigTextStyle().bigText(body)).setContentIntent(pi).setAutoCancel(true);
  nm.notify(hash,b.build());p.edit().putLong(key,now).apply();return true;
 }
 private void sendDetails(SharedPreferences p,NotificationManager nm,JSONObject g,JSONObject d,String id,String av,String hv,String state,long now,Set<String> favorites,boolean basicSent){
  boolean fin="post".equals(state),stars=p.getBoolean("stars",true),leaders=p.getBoolean("leaders",true);
  if(fin){
   String summary=AlertDigest.summary(d,favorites,stars,leaders);
   if(!summary.isEmpty()){
    if(!basicSent)send(p,nm,id,"detailfinal","NBA ATLAS · Κορυφαίοι / Τελικό",av+" "+g.optJSONObject("away").optString("score")+"–"+g.optJSONObject("home").optString("score")+" "+hv+"\n"+summary,now);
    p.edit().putLong("sent_"+id+"_detailfinal",now).apply();
   }
   return;
  }
  int q=g.optInt("period",0);String clock=g.optString("clock","");
  int completed=AlertDigest.completed(q,clock);
  if(p.getBoolean("periods",true)&&completed>0&&AlertDigest.lastAvailable(d)>=completed){
   String line=AlertDigest.periodText(d,completed,av,hv);
   if(!line.isEmpty()){
    String summary=AlertDigest.summary(d,favorites,stars,leaders);
    if(!summary.isEmpty())line+="\nΣτον τελευταίο έλεγχο: "+summary;
    String title=completed==2?"NBA ATLAS · Ημίχρονο":"NBA ATLAS · Τέλος "+(completed>4?"OT"+(completed-4):"Q"+completed);
    send(p,nm,id,"period_"+completed,title,line,now);
   }
  }
  if(stars||leaders){
   for(AlertDigest.Player pl:AlertDigest.players(d)){
    boolean favorite=stars&&favorites.contains(pl.id);if(!favorite&&!leaders)continue;
    int step=favorite?10:30;int tier=favorite?Math.min(60,(pl.pts/step)*step):pl.pts>=50?50:pl.pts>=40?40:pl.pts>=30?30:0;
    if(tier<step)continue;
    String key="sent_"+id+"_mark_"+pl.id+"_";
    int previous=0;for(int k:new int[]{10,20,30,40,50,60})if(p.contains(key+k))previous=Math.max(previous,k);
    if(tier<=previous)continue;
    send(p,nm,id,"mark_"+pl.id+"_"+tier,(favorite?"NBA ATLAS · Αγαπημένος":"NBA ATLAS · Μεγάλη εμφάνιση"),pl.name+" · "+pl.line()+"\n"+av+" — "+hv+" · "+g.optJSONObject("away").optString("score")+"–"+g.optJSONObject("home").optString("score"),now);
   }
  }
 }
 private void poll()throws Exception{
  SharedPreferences p=getSharedPreferences("atlas_alerts",MODE_PRIVATE);NotificationManager nm=getSystemService(NotificationManager.class);
  if(!p.getBoolean("enabled",false)||!nm.areNotificationsEnabled())return;
  if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
  channel(this);Set<String> fav=new HashSet<>(Arrays.asList(p.getString("teams","ALL").split("[,;\\s]+")));long now=System.currentTimeMillis();SimpleDateFormat fmt=new SimpleDateFormat("yyyyMMdd",Locale.US);TimeZone zone=TimeZone.getTimeZone("America/New_York");fmt.setTimeZone(zone);
  Set<String> favoritePlayers=new HashSet<>(Arrays.asList(p.getString("players","").split(",")));favoritePlayers.remove("");
  Set<String> seenGames=new HashSet<>();
  boolean ok=false;for(int offset=-1;offset<=1;offset++){Calendar cal=Calendar.getInstance(zone);cal.add(Calendar.DAY_OF_YEAR,offset);JSONArray games;try{games=read(fmt.format(cal.getTime()));ok=true;}catch(Exception e){continue;}
   for(int i=0;i<games.length();i++){if(Thread.currentThread().isInterrupted()||!p.getBoolean("enabled",false))return;JSONObject g=games.optJSONObject(i);if(g==null)continue;String id=g.optString("id"),state=g.optString("state");if(!id.matches("[0-9]{4,12}")||!seenGames.add(id))continue;JSONObject a=g.optJSONObject("away"),h=g.optJSONObject("home");if(a==null||h==null)continue;String av=a.optString("abbr"),hv=h.optString("abbr");if(!fav.contains("ALL")&&!fav.contains(av)&&!fav.contains(hv))continue;
    long start=parse(g.optString("date")),delta=start-now;if(start<=0)continue;String kind=null,title=null,body=av+" — "+hv;
    if("pre".equals(state)&&delta>0&&delta<=30*60000L&&p.getBoolean("pre",true)){kind="pre";title="NBA ATLAS · Σύντομα τζάμπολ";body+=" · περίπου "+Math.max(1,delta/60000)+" λεπτά";}
    else if("in".equals(state)&&delta<=0&&delta>=-90*60000L&&p.getBoolean("live",true)){kind="live";title="NBA ATLAS · LIVE";body+=" · "+a.optString("score","—")+"–"+h.optString("score","—");}
    else if("post".equals(state)&&delta<=-60*60000L&&delta>=-5*3600000L&&p.getBoolean("final",true)){kind="final";title="NBA ATLAS · Τελικό";body+=" · "+a.optString("score","—")+"–"+h.optString("score","—");}
    boolean details=("in".equals(state)&&delta<=0&&delta>=-5*3600000L)||("post".equals(state)&&delta<=-60*60000L&&delta>=-5*3600000L);
    boolean needDetails=details&&(p.getBoolean("periods",true)||p.getBoolean("leaders",true)||p.getBoolean("stars",true));
    boolean fin="post".equals(state);
    if(fin&&p.contains("sent_"+id+"_detailfinal"))needDetails=false;
    JSONObject detail=null;
    if(needDetails)try{detail=game(id);}catch(Exception ignored){}
    if(fin&&kind!=null&&detail!=null){
     String stats=AlertDigest.summary(detail,favoritePlayers,p.getBoolean("stars",true),p.getBoolean("leaders",true));
     if(!stats.isEmpty())body+="\n"+stats;
    }
    boolean sent=kind!=null&&send(p,nm,id,kind,title,body,now);
    if(detail!=null)sendDetails(p,nm,g,detail,id,av,hv,state,now,favoritePlayers,sent);
   }
  }
  SharedPreferences.Editor ed=p.edit();for(Map.Entry<String,?> e:p.getAll().entrySet())if(e.getKey().startsWith("sent_")&&e.getValue() instanceof Long&&now-(Long)e.getValue()>14L*86400000)ed.remove(e.getKey());ed.apply();if(!ok)throw new IOException("scoreboard unavailable");
 }
}
