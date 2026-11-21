package app.nbaatlas.mobile;
import java.util.*;
import org.json.*;
final class AlertDigest {
 static class Player {
  String id,name,team;int pts,reb,ast,stl,blk;
  Player(String id,String name,String team,int pts,int reb,int ast,int stl,int blk){this.id=id;this.name=name;this.team=team;this.pts=pts;this.reb=reb;this.ast=ast;this.stl=stl;this.blk=blk;}
  String line(){return pts+" PTS"+(reb>=0?" · "+reb+" REB":"")+(ast>=0?" · "+ast+" AST":"")+(stl>0?" · "+stl+" STL":"")+(blk>0?" · "+blk+" BLK":"");}
 }
 static int index(JSONArray a,String s){if(a==null)return -1;for(int i=0;i<a.length();i++)if(s.equals(a.optString(i)))return i;return -1;}
 static int value(JSONArray a,int i){if(a==null||i<0||i>=a.length())return -1;try{return Integer.parseInt(a.optString(i));}catch(Exception e){return -1;}}
 static List<Player> players(JSONObject data){
  List<Player> out=new ArrayList<>();Set<String> seen=new HashSet<>();JSONArray ts=data.optJSONArray("players");if(ts==null)return out;
  for(int i=0;i<ts.length();i++){JSONObject t=ts.optJSONObject(i);if(t==null)continue;JSONObject team=t.optJSONObject("team");String ab=team==null?"":team.optString("abbr");JSONArray groups=t.optJSONArray("groups");if(groups==null)continue;
   for(int z=0;z<groups.length();z++){JSONObject g=groups.optJSONObject(z);if(g==null)continue;JSONArray labels=g.optJSONArray("labels"),rows=g.optJSONArray("athletes");int pi=index(labels,"PTS");if(pi<0||rows==null)continue;
    for(int r=0;r<rows.length();r++){JSONObject row=rows.optJSONObject(r);if(row==null)continue;JSONObject a=row.optJSONObject("athlete");JSONArray stats=row.optJSONArray("stats");if(a==null)continue;String id=a.optString("id"),name=a.optString("name");int pts=value(stats,pi);if(pts<0||name.isEmpty()||!id.matches("[0-9]{1,12}")||!seen.add(id))continue;
     int min=index(labels,"MIN");if(min>=0&&"0".equals(stats.optString(min))&&pts==0)continue;
     out.add(new Player(id,name,ab,pts,value(stats,index(labels,"REB")),value(stats,index(labels,"AST")),value(stats,index(labels,"STL")),value(stats,index(labels,"BLK"))));
    }
   }
  }
  return out;
 }
 static int completed(int current,String clock){if(current<1)return 0;return ("0:00".equals(clock)||"0.0".equals(clock)||"0:00.0".equals(clock)||"00:00".equals(clock))?current:current-1;}
 static JSONArray periods(JSONObject d,String side){JSONArray p=d.optJSONArray("periods");if(p!=null)for(int i=0;i<p.length();i++){JSONObject t=p.optJSONObject(i);if(t!=null&&side.equals(t.optString("homeAway")))return t.optJSONArray("linescores");}return null;}
 static int lastAvailable(JSONObject d){JSONArray a=periods(d,"away"),h=periods(d,"home");return a==null||h==null?0:Math.min(a.length(),h.length());}
 static int score(JSONArray a,int i){JSONObject p=a.optJSONObject(i);if(p==null||p.optInt("period",i+1)!=i+1||!p.has("points")||p.isNull("points"))return -1;return p.optInt("points",-1);}
 static String periodText(JSONObject d,int q,String a,String h){
  JSONArray pa=periods(d,"away"),ph=periods(d,"home");if(q<1||lastAvailable(d)<q)return "";int at=0,ht=0;
  for(int i=0;i<q;i++){int x=score(pa,i),y=score(ph,i);if(x<0||y<0)return "";at+=x;ht+=y;}
  return a+" "+at+"–"+ht+" "+h+" · "+(q>4?"OT"+(q-4):"Q"+q)+": "+score(pa,q-1)+"–"+score(ph,q-1);
 }
 static String summary(JSONObject d,Set<String> favorites,boolean stars,boolean leaders){
  List<Player> p=players(d);List<String> lines=new ArrayList<>();
  if(stars){for(Player x:p)if(favorites.contains(x.id)&&lines.size()<4)lines.add("★ "+x.name+" "+x.line());}
  if(leaders&&!p.isEmpty()){Player top=Collections.max(p,Comparator.comparingInt(x->x.pts));if(top.pts>0&&!(stars&&favorites.contains(top.id)))lines.add("Πρώτος σκόρερ: "+top.name+" "+top.line());Player r=Collections.max(p,Comparator.comparingInt(x->x.reb));if(r.reb>=10&&!r.id.equals(top.id)&&!(stars&&favorites.contains(r.id)))lines.add("Ριμπάουντ: "+r.name+" "+r.reb);Player a=Collections.max(p,Comparator.comparingInt(x->x.ast));if(a.ast>=10&&!a.id.equals(top.id)&&!a.id.equals(r.id)&&!(stars&&favorites.contains(a.id)))lines.add("Ασίστ: "+a.name+" "+a.ast);}
  return String.join("\n",lines);
 }
}