package app.nbaatlas.mobile;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {
 private static final String HOME="https://nba-atlas.vercel.app/";
 private static final String HOST="nba-atlas.vercel.app";
 private static final int DARK=Color.rgb(8,9,12);
 private WebView webView;
 private ProgressBar progress;
 @Override public void onCreate(Bundle saved) {
  super.onCreate(saved);
  getWindow().setStatusBarColor(DARK);
  getWindow().setNavigationBarColor(DARK);
  if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.Q)getWindow().setNavigationBarContrastEnforced(false);
  FrameLayout root=new FrameLayout(this);root.setBackgroundColor(DARK);
  webView=new WebView(this);webView.setBackgroundColor(DARK);
  root.addView(webView,new FrameLayout.LayoutParams(-1,-1));
  progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
  progress.setMax(100);
  root.addView(progress,new FrameLayout.LayoutParams(-1,Math.round(3*getResources().getDisplayMetrics().density)));
  setContentView(root);
  WebSettings s=webView.getSettings();
  s.setUserAgentString(s.getUserAgentString()+" NBAAtlasAndroid/3.0");
  s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false);s.setAllowContentAccess(false);
  s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);
  s.setJavaScriptCanOpenWindowsAutomatically(false);
  s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  s.setCacheMode(WebSettings.LOAD_DEFAULT);
  if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O)s.setSafeBrowsingEnabled(true);
  webView.setWebChromeClient(new WebChromeClient(){
   @Override public void onProgressChanged(WebView w,int p){progress.setProgress(p);progress.setVisibility(p>=100?View.GONE:View.VISIBLE);}
  });
  webView.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView w,WebResourceRequest r){
    Uri u=r.getUrl();String scheme=u.getScheme();
    if("https".equalsIgnoreCase(scheme)&&HOST.equalsIgnoreCase(u.getHost())){
     if(r.isForMainFrame()&&"/__atlas_notifications".equals(u.getPath())){showAlertSettings(u.getQueryParameter("teams"));return true;}
     return false;
    }
    if("https".equalsIgnoreCase(scheme)||"http".equalsIgnoreCase(scheme)||"mailto".equalsIgnoreCase(scheme)||"tel".equalsIgnoreCase(scheme)){
     try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ex){Toast.makeText(MainActivity.this,"Δεν μπορεί να ανοίξει ο σύνδεσμος",Toast.LENGTH_SHORT).show();}
    }
    return true;
   }
   @Override public void onReceivedError(WebView w,WebResourceRequest r,WebResourceError e){
    if(r.isForMainFrame()&&r.getUrl().toString().startsWith(HOME))showOffline();
   }
  });
  GameAlertService.channel(this);
  if(saved==null||webView.restoreState(saved)==null)webView.loadUrl(startUrl(getIntent()));
 }
 private String startUrl(Intent i){String id=i==null?null:i.getStringExtra("gameId");return id!=null&&id.matches("[0-9]{4,12}")?HOME+"#/game/"+id:HOME;}
 @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);if(webView!=null)webView.loadUrl(startUrl(i));}
 private void showAlertSettings(String suggested){
  android.content.SharedPreferences p=getSharedPreferences("atlas_alerts",MODE_PRIVATE);
  android.widget.LinearLayout l=new android.widget.LinearLayout(this);l.setOrientation(1);int pad=(int)(20*getResources().getDisplayMetrics().density);l.setPadding(pad,0,pad,0);
  android.widget.Switch en=new android.widget.Switch(this);en.setText("Ειδοποιήσεις αγώνων");en.setChecked(p.getBoolean("enabled",false));l.addView(en);
  android.widget.TextView desc=new android.widget.TextView(this);desc.setText("Έλεγχος στο παρασκήνιο περίπου ανά 15 λεπτά, ανάλογα με το Android. Ομάδες: ALL ή κωδικοί LAL, DAL, MIN.");desc.setPadding(0,pad/2,0,pad/2);l.addView(desc);
  android.widget.EditText teams=new android.widget.EditText(this);teams.setSingleLine(true);teams.setHint("ALL ή LAL, DAL, MIN");teams.setText(suggested!=null&&suggested.matches("[A-Z,]{1,180}")?suggested:p.getString("teams","ALL"));l.addView(teams);
  android.widget.CheckBox pre=new android.widget.CheckBox(this);pre.setText("30 λεπτά πριν τον αγώνα");pre.setChecked(p.getBoolean("pre",true));l.addView(pre);
  android.widget.CheckBox live=new android.widget.CheckBox(this);live.setText("Έναρξη αγώνα");live.setChecked(p.getBoolean("live",true));l.addView(live);
  android.widget.CheckBox fin=new android.widget.CheckBox(this);fin.setText("Τελικό αποτέλεσμα");fin.setChecked(p.getBoolean("final",true));l.addView(fin);
  new android.app.AlertDialog.Builder(this).setTitle("NBA ATLAS / Alerts").setView(l).setNegativeButton("Άκυρο",null).setPositiveButton("Αποθήκευση",(d,w)->{
   String filter=teams.getText().toString().toUpperCase(java.util.Locale.ROOT).replaceAll("[^A-Z,; ]","").trim();if(filter.isEmpty())filter="ALL";
   p.edit().putBoolean("enabled",en.isChecked()).putString("teams",filter).putBoolean("pre",pre.isChecked()).putBoolean("live",live.isChecked()).putBoolean("final",fin.isChecked()).apply();
   if(!en.isChecked()){GameAlertService.cancel(this);return;}
   if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},44);return;}
   if(getSystemService(android.app.NotificationManager.class).areNotificationsEnabled()){GameAlertService.schedule(this);Toast.makeText(this,"Οι ειδοποιήσεις ενεργοποιήθηκαν",Toast.LENGTH_SHORT).show();}
   else{startActivity(new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName()));}
  }).show();
 }
 @Override public void onRequestPermissionsResult(int code,String[] perm,int[] grants){super.onRequestPermissionsResult(code,perm,grants);if(code==44&&grants.length>0&&grants[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)GameAlertService.schedule(this);}
 @Override protected void onResume(){super.onResume();if(getSharedPreferences("atlas_alerts",MODE_PRIVATE).getBoolean("enabled",false)&&getSystemService(android.app.NotificationManager.class).areNotificationsEnabled())GameAlertService.periodic(this);}
 private void showOffline(){
  String html="<!doctype html><html lang='el'><meta name='viewport' content='width=device-width,initial-scale=1'>"
   +"<style>body{background:#08090c;color:#eff9fd;font:16px Arial,sans-serif;display:grid;place-items:center;min-height:95vh}"
   +"main{text-align:center;padding:28px}p{color:#bad0dd;line-height:1.6}a{background:#ff5a1f;color:#111111;padding:14px 22px;border-radius:10px;display:inline-block;text-decoration:none}</style>"
   +"<main><h1>NBA ATLAS</h1><p>Χρειάζεται σύνδεση στο internet για τα ζωντανά δεδομένα.</p><a href='"+HOME+"'>Επανάληψη</a></main></html>";
  webView.loadDataWithBaseURL(HOME,html,"text/html","UTF-8",null);
 }
 @Override protected void onSaveInstanceState(Bundle out){if(webView!=null)webView.saveState(out);super.onSaveInstanceState(out);}
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(webView!=null){((ViewGroup)webView.getParent()).removeView(webView);webView.destroy();webView=null;}super.onDestroy();}
}