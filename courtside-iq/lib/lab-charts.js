/**
 * COURTSIDE IQ — Lab charts. Small SVG/HTML generators. Colours come from CSS
 * classes (see lab.css) so the palette can change without touching code.
 */
import {ols,normalPdf} from './lab-math.js';
const ok=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const nf=(x,d=1)=>ok(x)?Number(x).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';

export function niceTicks(lo,hi,n=5){
 if(!(hi>lo))return [lo];
 const raw=(hi-lo)/n,mag=10**Math.floor(Math.log10(raw)),f=raw/mag,step=(f<1.5?1:f<3?2:f<7?5:10)*mag;
 const out=[];for(let v=Math.ceil(lo/step)*step;v<=hi+1e-9;v+=step)out.push(Math.round(v/step)*step);
 return out;
}
const dec=step=>step>=1?0:step>=.1?1:step>=.01?2:3;
const tickFmt=ticks=>{const s=ticks.length>1?ticks[1]-ticks[0]:1;return v=>Number(v).toFixed(dec(s))};

/** Scatter with optional OLS line. points: [{x,y,label,cls,r}] */
export function scatter(points,{xLabel='',yLabel='',reg=true,aria='Scatter plot',labels=true,invertY=false}={}){
 const p=points.filter(d=>ok(d.x)&&ok(d.y));
 if(p.length<3)return '<div class="blank">Fewer than three points with both values.</div>';
 const w=720,h=400,L=58,R=700,T=20,B=352;
 const xs=p.map(d=>+d.x),ys=p.map(d=>+d.y),px=(Math.max(...xs)-Math.min(...xs))*.06||1,py=(Math.max(...ys)-Math.min(...ys))*.08||1;
 const x0=Math.min(...xs)-px,x1=Math.max(...xs)+px,y0=Math.min(...ys)-py,y1=Math.max(...ys)+py;
 const X=v=>L+(v-x0)/(x1-x0)*(R-L),Y=v=>invertY?T+(v-y0)/(y1-y0)*(B-T):B-(v-y0)/(y1-y0)*(B-T);
 const tx=niceTicks(x0,x1),ty=niceTicks(y0,y1),fx=tickFmt(tx),fy=tickFmt(ty);
 const grid=tx.map(v=>`<line x1="${X(v)}" y1="${T}" x2="${X(v)}" y2="${B}" class="g"/><text x="${X(v)}" y="${B+18}" text-anchor="middle">${fx(v)}</text>`).join('')+ty.map(v=>`<line x1="${L}" y1="${Y(v)}" x2="${R}" y2="${Y(v)}" class="g"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${fy(v)}</text>`).join('');
 const fit=reg?ols(p):null;
 const line=fit?`<line x1="${X(x0)}" y1="${Y(fit.intercept+fit.slope*x0)}" x2="${X(x1)}" y2="${Y(fit.intercept+fit.slope*x1)}" class="regline"/>`:'';
 const dots=p.map(d=>`<g><circle cx="${X(d.x).toFixed(1)}" cy="${Y(d.y).toFixed(1)}" r="${d.r||5.5}" class="dot ${d.cls||'pri'}"><title>${esc(d.label||'')} · ${nf(d.x,2)}, ${nf(d.y,2)}</title></circle>${labels&&d.label&&p.length<=40?`<text x="${X(d.x)+8}" y="${Y(d.y)+3}" class="lbl">${esc(d.short||d.label)}</text>`:''}</g>`).join('');
 const eq=fit?`<p class="lab-eq">y = ${nf(fit.intercept,3)} ${fit.slope<0?'−':'+'} ${nf(Math.abs(fit.slope),3)}·x &nbsp;·&nbsp; r = ${nf(fit.r,3)} &nbsp;·&nbsp; R² = ${nf(fit.r2,3)} &nbsp;·&nbsp; n = ${fit.n}</p>`:'';
 return `<div class="lab-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(aria)}">${grid}${line}${dots}<text x="${(L+R)/2}" y="${h-6}" text-anchor="middle" class="ax">${esc(xLabel)}</text><text transform="translate(14 ${(T+B)/2}) rotate(-90)" text-anchor="middle" class="ax">${esc(yLabel)}</text></svg>${eq}</div>`;
}

/** Horizontal bars. rows: [{label,value,cls?}] */
export function bars(rows,{fmt=v=>nf(v,1),diverging=false}={}){
 const r=rows.filter(d=>ok(d.value));if(!r.length)return '<div class="blank">No values to chart.</div>';
 const max=Math.max(...r.map(d=>Math.abs(d.value)),1e-9);
 return `<div class="lab-bars">${r.map(d=>{
  const pct=Math.abs(d.value)/max*(diverging?50:100),neg=d.value<0,cls=d.cls||(diverging?(neg?'neg':'sec'):'pri');
  return `<div class="lab-bar-row"><span title="${esc(d.label)}">${esc(d.short||d.label)}</span><div class="lab-bar-track"><i class="${cls}" style="width:${Math.max(.8,pct).toFixed(1)}%;${diverging?(neg?'right:50%':'left:50%'):'left:0'}"></i>${diverging?'<u></u>':''}</div><b>${esc(fmt(d.value))}</b></div>`}).join('')}</div>`;
}

/** Histogram from bins [{from,to,count}] */
export function histogramSvg(bins,{xLabel='',aria='Histogram'}={}){
 if(!bins?.length)return '<div class="blank">Not enough values.</div>';
 const w=720,h=300,L=46,R=706,T=16,B=252,max=Math.max(...bins.map(b=>b.count),1),bw=(R-L)/bins.length;
 const Y=v=>B-v/max*(B-T);
 const ticks=niceTicks(0,max,4).filter(Number.isInteger);
 return `<div class="lab-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(aria)}">${ticks.map(v=>`<line x1="${L}" y1="${Y(v)}" x2="${R}" y2="${Y(v)}" class="g"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v}</text>`).join('')}
 ${bins.map((b,i)=>`<g><rect x="${(L+i*bw+2).toFixed(1)}" y="${Y(b.count).toFixed(1)}" width="${(bw-4).toFixed(1)}" height="${(B-Y(b.count)).toFixed(1)}" rx="3" class="bar pri"><title>${nf(b.from,2)}–${nf(b.to,2)}: ${b.count}</title></rect><text x="${(L+i*bw+bw/2).toFixed(1)}" y="${B+16}" text-anchor="middle">${nf((b.from+b.to)/2,bins[0].to-bins[0].from<1?2:1)}</text></g>`).join('')}
 <text x="${(L+R)/2}" y="${h-8}" text-anchor="middle" class="ax">${esc(xLabel)}</text></svg></div>`;
}

/** Multi-series line chart. series: [{name,cls,pts:[{x,y}]}] */
export function lines(series,{xLabel='',yLabel='',aria='Line chart',xFmt=v=>String(v)}={}){
 const s=series.map(d=>({...d,pts:d.pts.filter(q=>ok(q.x)&&ok(q.y))})).filter(d=>d.pts.length>=2);
 if(!s.length)return '<div class="blank">Fewer than two data points per series.</div>';
 const all=s.flatMap(d=>d.pts),w=720,h=380,L=58,R=700,T=18,B=322;
 const x0=Math.min(...all.map(q=>q.x)),x1=Math.max(...all.map(q=>q.x)),yl=Math.min(...all.map(q=>q.y)),yh=Math.max(...all.map(q=>q.y)),pad=(yh-yl)*.1||1;
 const y0=yl-pad,y1=yh+pad,X=v=>L+(v-x0)/Math.max(1e-9,x1-x0)*(R-L),Y=v=>B-(v-y0)/(y1-y0)*(B-T);
 const ty=niceTicks(y0,y1),fy=tickFmt(ty),tx=niceTicks(x0,x1,6);
 return `<div class="lab-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(aria)}">${ty.map(v=>`<line x1="${L}" y1="${Y(v)}" x2="${R}" y2="${Y(v)}" class="g"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${fy(v)}</text>`).join('')}${tx.map(v=>`<text x="${X(v)}" y="${B+20}" text-anchor="middle">${esc(xFmt(v))}</text>`).join('')}
 ${s.map(d=>`<path d="${d.pts.map((q,i)=>`${i?'L':'M'}${X(q.x).toFixed(1)} ${Y(q.y).toFixed(1)}`).join(' ')}" class="path ${d.cls||'pri'}"/>${d.pts.map(q=>`<circle cx="${X(q.x).toFixed(1)}" cy="${Y(q.y).toFixed(1)}" r="3.6" class="dot ${d.cls||'pri'}"><title>${esc(d.name)} · ${esc(xFmt(q.x))}: ${nf(q.y,2)}</title></circle>`).join('')}`).join('')}
 <text x="${(L+R)/2}" y="${h-8}" text-anchor="middle" class="ax">${esc(xLabel)}</text><text transform="translate(14 ${(T+B)/2}) rotate(-90)" text-anchor="middle" class="ax">${esc(yLabel)}</text></svg>
 <div class="lab-legend">${s.map(d=>`<span><i class="${d.cls||'pri'}"></i>${esc(d.name)}</span>`).join('')}</div></div>`;
}

/** Correlation heat-map. matrix values in [-1,1] or null. */
export function heatmap(matrix,labels){
 const n=labels.length,cell=Math.min(64,Math.floor(560/n)),L=118,T=96,w=L+cell*n+10,h=T+cell*n+10;
 const col=v=>!ok(v)?'#1a1f1c':v>=0?`rgba(184,242,58,${(.12+.88*v).toFixed(2)})`:`rgba(255,77,141,${(.12+.88*-v).toFixed(2)})`;
 return `<div class="lab-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Correlation matrix">
 ${labels.map((l,i)=>`<text x="${L-8}" y="${T+i*cell+cell/2+4}" text-anchor="end">${esc(l)}</text><text transform="translate(${L+i*cell+cell/2} ${T-8}) rotate(-45)" text-anchor="start">${esc(l)}</text>`).join('')}
 ${matrix.map((row,i)=>row.map((v,j)=>`<g><rect x="${L+j*cell}" y="${T+i*cell}" width="${cell-2}" height="${cell-2}" rx="4" fill="${col(v)}"><title>${esc(labels[i])} × ${esc(labels[j])}: ${ok(v)?nf(v,2):'n/a'}</title></rect>${cell>=36?`<text x="${L+j*cell+cell/2-1}" y="${T+i*cell+cell/2+3}" text-anchor="middle" class="hv">${ok(v)?nf(v,2):''}</text>`:''}</g>`).join('')).join('')}</svg>
 <p class="lab-caption">Lime = positive, pink = negative. Pearson r on players with both values.</p></div>`;
}

/** Normal curve of expected margin, shading home-win area. */
export function marginCurve(mu,sigma,{homeLabel='Home',awayLabel='Away'}={}){
 const w=720,h=260,L=30,R=690,T=16,B=214,lo=-34,hi=34,X=v=>L+(v-lo)/(hi-lo)*(R-L),peak=normalPdf(0,0,sigma),Y=v=>B-v/peak/1.15*(B-T);
 const pts=[];for(let m=lo;m<=hi;m+=.5)pts.push([m,normalPdf(m,mu,sigma)]);
 const path=(f)=>pts.filter(f).map((q,i)=>`${i?'L':'M'}${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(' ');
 const area=(f,cls)=>{const a=pts.filter(f);if(a.length<2)return '';return `<path d="${path(f)} L${X(a.at(-1)[0]).toFixed(1)} ${B} L${X(a[0][0]).toFixed(1)} ${B} Z" class="area ${cls}"/>`};
 return `<div class="lab-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Distribution of final margin">${area(q=>q[0]>0,'sec')}${area(q=>q[0]<=0,'neg')}
 <path d="${path(()=>true)}" class="path pri"/><line x1="${X(0)}" y1="${T}" x2="${X(0)}" y2="${B}" class="g strong"/><line x1="${X(mu)}" y1="${T}" x2="${X(mu)}" y2="${B}" class="regline"/>
 ${[-30,-20,-10,0,10,20,30].map(v=>`<text x="${X(v)}" y="${B+18}" text-anchor="middle">${v>0?'+'+v:v}</text>`).join('')}
 <text x="${X(-17)}" y="${T+14}" text-anchor="middle" class="lbl">${esc(awayLabel)} wins</text><text x="${X(17)}" y="${T+14}" text-anchor="middle" class="lbl">${esc(homeLabel)} wins</text>
 <text x="${(L+R)/2}" y="${h-4}" text-anchor="middle" class="ax">Final margin (home − away), points</text></svg></div>`;
}
