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
    if("https".equalsIgnoreCase(scheme)&&HOST.equalsIgnoreCase(u.getHost()))return false;
    if("https".equalsIgnoreCase(scheme)||"http".equalsIgnoreCase(scheme)||"mailto".equalsIgnoreCase(scheme)||"tel".equalsIgnoreCase(scheme)){
     try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ex){Toast.makeText(MainActivity.this,"Δεν μπορεί να ανοίξει ο σύνδεσμος",Toast.LENGTH_SHORT).show();}
    }
    return true;
   }
   @Override public void onReceivedError(WebView w,WebResourceRequest r,WebResourceError e){
    if(r.isForMainFrame()&&r.getUrl().toString().startsWith(HOME))showOffline();
   }
  });
  if(saved==null||webView.restoreState(saved)==null)webView.loadUrl(HOME);
 }
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