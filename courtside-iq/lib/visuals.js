// Dependency-free, server-testable SVG charts. All data come from the caller.
const clean = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
export function axisScore(value, min, max) {
  if (!valid(value) || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
  return Math.round(Math.max(0, Math.min(1, (Number(value) - min) / (max - min))) * 1000) / 10;
}
export function radarChart(series, axes, opts = {}) {
  const active = axes.filter(a => series.every(s => axisScore(s.values?.[a.key], a.min, a.max) !== null));
  if (series.length < 1 || active.length < 3) return `<div class="blank">Radar requires at least 3 comparable, observed metrics for every selected player. Missing values are not imputed.</div>`;
  const cx=300,cy=220,r=142,n=active.length;
  const vertex=(i,t=1)=>{const angle=-Math.PI/2+2*Math.PI*i/n;return [cx+Math.cos(angle)*r*t,cy+Math.sin(angle)*r*t]};
  const pts=v=>v.map((t,i)=>vertex(i,t/100).map(x=>x.toFixed(1)).join(',')).join(' ');
  const rings=[20,40,60,80,100].map(t=>`<polygon points="${pts(Array(n).fill(t))}" fill="${t%40?'none':'#8b77eb08'}" stroke="#dedce9" stroke-width="1"/>`).join('');
  const spokes=active.map((a,i)=>{const [x,y]=vertex(i);const [lx,ly]=vertex(i,1.22);const anchor=lx<cx-24?'end':lx>cx+24?'start':'middle';return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2dfec"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-family="DM Sans, sans-serif" font-size="12" font-weight="700" fill="#5f6375">${clean(a.label)}</text>`}).join('');
  const colors=['#6550d9','#a0b73a','#ef8564','#28a7ae'];
  const polygons=series.map((s,j)=>{const vals=active.map(a=>axisScore(s.values[a.key],a.min,a.max));const points=pts(vals);const color=colors[j%colors.length];return `<polygon points="${points}" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-width="3.4" stroke-linejoin="round"/><g fill="${color}" stroke="#fff" stroke-width="1.8">${vals.map((v,i)=>{const [x,y]=vertex(i,v/100);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.4"><title>${clean(s.name)} · ${clean(active[i].label)}: ${clean(s.values[active[i].key])} (${v}/100 scaled)</title></circle>`}).join('')}</g>`}).join('');
  const legend=series.map((s,i)=>`<span class="visual-legend-item"><span class="visual-swatch" style="background:${colors[i%colors.length]}"></span>${clean(s.name)}</span>`).join('');
  const table=`<div class="radar-score-table"><div class="radar-table-head"><span>METRIC</span>${series.map(s=>`<span>${clean(s.name)}</span>`).join('')}</div>${active.map(a=>`<div class="radar-table-row"><span>${clean(a.label)}</span>${series.map(s=>`<strong>${Number(s.values[a.key]).toLocaleString('en-US',{maximumFractionDigits:2})}${clean(a.suffix||'')}</strong>`).join('')}</div>`).join('')}</div>`;
  return `<div class="visual-chart"><svg viewBox="0 0 640 460" class="radar-svg" role="img" aria-label="Radar comparison of ${clean(series.map(s=>s.name).join(' and '))}: ${clean(active.map(a=>a.label).join(', '))}">${rings}${spokes}${polygons}</svg><div class="visual-legend">${legend}</div>${table}<p class="visual-caption">${clean(opts.note||'Axes are linearly normalized against disclosed reference bands. They are not league percentiles and should not be interpreted as a validated composite rating.')}</p></div>`;
}
export function trendChart(series, opts={}) {
  const available=series.filter(s=>Array.isArray(s.points)&&s.points.some(p=>valid(p.rating)));
  if(!available.length)return `<div class="blank">Season-by-season ratings are unavailable. No synthetic career curve is shown.</div>`;
  const all=available.flatMap(s=>s.points.filter(p=>valid(p.rating)).map(p=>Number(p.rating)));
  const min=Math.floor(Math.min(-2,...all)-1),max=Math.ceil(Math.max(6,...all)+1),width=660,height=290,x0=58,x1=622,y0=24,y1=234;
  const largest=Math.max(2,...available.map(s=>s.points.length));
  const xy=(v,i)=>[x0+(i/(largest-1))*(x1-x0),y1-(Number(v)-min)/(max-min)*(y1-y0)];
  const grid=Array.from({length:5},(_,i)=>{const v=min+i*(max-min)/4,y=xy(v,0)[1];return `<line x1="${x0}" x2="${x1}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e4e3ec"/><text x="${x0-9}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="11" fill="#9896aa">${v.toFixed(1)}</text>`}).join('');
  const palette=['#6550d9','#a2b640','#ef8564'];
  const paths=available.map((s,z)=>{const c=palette[z%palette.length],p=s.points.map((q,i)=>valid(q.rating)?[...xy(q.rating,i),q]:null).filter(Boolean);return `<polyline points="${p.map(v=>v.slice(0,2).map(k=>k.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${p.map(v=>`<circle cx="${v[0].toFixed(1)}" cy="${v[1].toFixed(1)}" r="3.7" fill="${c}"><title>${clean(s.name)} · ${clean(v[2].year)}: ${Number(v[2].rating).toFixed(2)} RAPTOR</title></circle>`).join('')}`}).join('');
  const labels=Array.from({length:Math.min(7,largest)},(_,i)=>{let idx=Math.round(i*(largest-1)/(Math.min(7,largest)-1));const x=x0+idx/(largest-1)*(x1-x0);return `<text x="${x.toFixed(1)}" y="${y1+24}" text-anchor="middle" font-size="11" fill="#78798a">${idx+1}</text>`}).join('');
  return `<div class="visual-chart"><svg viewBox="0 0 ${width} ${height}" class="trend-svg" role="img" aria-label="Career season RAPTOR trajectory for ${clean(available.map(x=>x.name).join(' and '))}">${grid}${paths}${labels}<text x="340" y="286" font-size="10" text-anchor="middle" fill="#8c8a98">Career season number (not calendar year)</text></svg><div class="visual-legend">${available.map((s,i)=>`<span class="visual-legend-item"><span class="visual-swatch" style="background:${palette[i%palette.length]}"></span>${clean(s.name)}</span>`).join('')}</div><p class="visual-caption">${clean(opts.note||'Minute-weighted regular-season/available historical RAPTOR by chronological career season; sample and historical coverage vary across players.')}</p></div>`;
}
export function scatterChart(players) {
  const points=players.filter(p=>valid(p.ts)&&valid(p.pts)&&Number(p.ts)>=0&&Number(p.ts)<=100&&Number(p.pts)>=0).slice(0,125);
  if(points.length<4)return `<div class="blank">At least four players with observed TS% and points per game are needed for a scatter chart.</div>`;
  const xMin=Math.max(0,Math.floor(Math.min(...points.map(p=>Number(p.ts)))/5)*5-5),xMax=Math.min(100,Math.ceil(Math.max(...points.map(p=>Number(p.ts)))/5)*5+5),yMax=Math.max(10,Math.ceil(Math.max(...points.map(p=>Number(p.pts)))/5)*5+5);
  const X=v=>58+(Number(v)-xMin)/Math.max(1,xMax-xMin)*574,Y=v=>242-Number(v)/yMax*215;
  const grid=Array.from({length:5},(_,i)=>{let xx=58+i*(574/4),yy=242-i*215/4;return `<line x1="${xx}" x2="${xx}" y1="27" y2="242" stroke="#e9e8f0"/><line x1="58" x2="632" y1="${yy}" y2="${yy}" stroke="#e9e8f0"/><text x="${xx}" y="260" text-anchor="middle" font-size="10" fill="#9996a7">${Math.round(xMin+(xMax-xMin)*i/4)}%</text><text x="49" y="${yy+4}" text-anchor="end" font-size="10" fill="#9996a7">${Math.round(yMax*i/4)}</text>`}).join('');
  const circles=points.map((p,i)=>`<circle cx="${X(p.ts).toFixed(1)}" cy="${Y(p.pts).toFixed(1)}" r="${Math.max(4,Math.min(10,Math.sqrt(Number(p.reb)||4)*2)).toFixed(1)}" fill="${i%2?'#776be5':'#a5b94b'}" fill-opacity=".67" stroke="#fff" stroke-width="1.4"><title>${clean(p.name)} — ${Number(p.pts).toFixed(1)} PPG, ${Number(p.ts).toFixed(1)}% TS</title></circle>`).join('');
  return `<div class="visual-chart"><svg viewBox="0 0 660 294" class="scatter-svg" role="img" aria-label="True shooting percentage versus points per game scatter plot">${grid}${circles}<text x="335" y="287" text-anchor="middle" font-size="11" font-weight="700" fill="#72738a">TRUE SHOOTING %</text><text x="16" y="140" transform="rotate(-90 16 140)" text-anchor="middle" font-size="11" font-weight="700" fill="#72738a">POINTS / GAME</text></svg><p class="visual-caption">Each circle represents a player with observed values. Circle radius reflects rebounds per game when provided; otherwise it uses a fixed marker size. Hover/tap for details.</p></div>`;
}