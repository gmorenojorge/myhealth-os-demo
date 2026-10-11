/* MyHealth OS alpha 0.1: demo exclusively with synthetic, locally stored information.
   No medical records, backend, tracking, network integrations or AI model calls. */
(() => {
'use strict';
const STORAGE_KEY = 'myhealth_os_demo_v1';
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const pad = n => String(n).padStart(2,'0');
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const fromKey = key => new Date(`${key}T12:00:00`);
const shiftDate = (key, n) => { const d = fromKey(key); d.setDate(d.getDate()+n); return dateKey(d); };
const today = () => dateKey(new Date());
const fmtDate = (key, opts={day:'numeric',month:'short'}) => new Intl.DateTimeFormat('es-ES',opts).format(fromKey(key));
const num = (n,d=0) => Number(n).toLocaleString('es-ES',{maximumFractionDigits:d,minimumFractionDigits:d});
const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const esc = (s) => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attributes = s => esc(s).replace(/`/g,'&#96;');
const round=(n,d=0)=>Math.round(n*10**d)/10**d;
const ICONS = {
 today:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 10h18M9 3v7"/>',
 trends:'<path d="M3 17l6-6 4 3 8-9"/><path d="M16 5h5v5"/>',
 activity:'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
 labs:'<path d="M8 3v7l-4 7a3 3 0 0 0 2.6 4h10.8a3 3 0 0 0 2.6-4l-4-7V3M6 3h12M6 15h12"/>',
 nutrition:'<path d="M4 3v7a4 4 0 0 0 8 0V3M8 3v18M19 3v18M19 3c-6 2-6 9 0 9"/>',
 assistant:'<path d="m12 3 1.5 5 5 1.5-5 1.5L12 16l-1.5-5L5 9.5 10.5 8 12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16ZM4 16l.4 1.6L6 18l-1.6.4L4 20l-.4-1.6L2 18l1.6-.4L4 16Z"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7c0 7 8.9 12.5 8.9 12.5S20.8 18.6 20.8 11.6a5.5 5.5 0 0 0 0-7Z"/>',
 moon:'<path d="M20 15a8 8 0 0 1-11-11A8.5 8.5 0 1 0 20 15Z"/>',
 steps:'<path d="M9 3c0 5-5 6-5 11a3 3 0 0 0 6 0V8M17 7c0 4 3 5 3 10a3 3 0 1 1-6 0v-5"/>',
 bolt:'<path d="m13 2-9 11h7l-1 9 10-12h-7l0-8Z"/>',
 weight:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M9 13a3 3 0 1 1 6 0M12 10v3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 shield:'<path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/>',
 document:'<path d="M6 2h9l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M15 2v6h5M9 12h7M9 16h7"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.4 1.4m11.32 11.32 1.4 1.4M2 12h2m16 0h2M4.93 19.07l1.4-1.4M17.65 6.35l1.4-1.4"/>',
 coffee:'<path d="M3 8h14v7a6 6 0 0 1-12 0V8ZM17 9h2a3 3 0 0 1 0 6h-2M3 21h17"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 fire:'<path d="M12 22c5 0 8-3.7 8-8 0-4-2.5-6.7-4-8-.1 3.1-1.5 3.4-2 4-1-3.8-4-6-5-8 0 5-5 8-5 13a8 8 0 0 0 8 7Z"/>',
 drop:'<path d="M12 2C10 6 5 11 5 15a7 7 0 0 0 14 0c0-4-5-9-7-13Z"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 sliders:'<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>'
};
const icon = (name,extra='') => `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${ICONS[name]||ICONS.info}</svg>`;
const NAV = [{id:'today',label:'Hoy',icon:'today'},{id:'trends',label:'Evolución',icon:'trends'},{id:'activity',label:'Actividad',icon:'activity'},{id:'labs',label:'Analíticas',icon:'labs'},{id:'nutrition',label:'Nutrición',icon:'nutrition'},{id:'assistant',label:'Asistente',icon:'assistant'}];
const LABS = {
 glucose:{name:'Glucosa',unit:'mg/dL',lo:70,hi:99,category:'Metabolismo',decimals:0},
 ldl:{name:'Colesterol LDL',unit:'mg/dL',lo:0,hi:116,category:'Lípidos',decimals:0},
 hdl:{name:'Colesterol HDL',unit:'mg/dL',lo:40,hi:100,category:'Lípidos',decimals:0},
 hba1c:{name:'Hemoglobina glicosilada',unit:'%',lo:4,hi:5.6,category:'Metabolismo',decimals:1},
 vitaminD:{name:'Vitamina D',unit:'ng/mL',lo:30,hi:100,category:'Vitaminas',decimals:0},
 ferritin:{name:'Ferritina',unit:'ng/mL',lo:30,hi:300,category:'Hierro',decimals:0}
};
const METRICS = {
 hrv:{name:'Variabilidad cardíaca',short:'HRV',unit:'ms',icon:'heart',decimals:0,better:'high',description:'Dato sintético. La HRV depende del dispositivo, el método de medición y el contexto; no es un diagnóstico.'},
 resting:{name:'Frecuencia en reposo',short:'FC reposo',unit:'lpm',icon:'activity',decimals:0,better:'low',description:'Dato sintético. Una tendencia es más informativa que una medida aislada, pero no demuestra causalidad.'},
 sleep:{name:'Horas de sueño',short:'Sueño',unit:'h',icon:'moon',decimals:1,better:'high',description:'Duración ficticia de sueño. No representa una evaluación de calidad o de fases validada.'},
 steps:{name:'Pasos diarios',short:'Pasos',unit:'pasos',icon:'steps',decimals:0,better:'high',description:'Recuento de pasos simulado; los distintos dispositivos pueden duplicar o estimar mediciones.'},
 weight:{name:'Peso corporal',short:'Peso',unit:'kg',icon:'weight',decimals:1,better:'neutral',description:'Peso sintético. Una variación corta no permite inferir cambios en grasa corporal.'}
};
function sampleData(){
 const days=[]; const start=shiftDate(today(),-89);
 for(let i=0;i<90;i++){
  const key=shiftDate(start,i), weekDay=fromKey(key).getDay();
  const smooth=Math.sin(i*.31), wobble=Math.cos(i*.92);
  days.push({date:key,hrv:Math.round(45+i*.09+6*smooth+2*wobble),resting:Math.round(65-i*.045-2.5*smooth+1.2*wobble),sleep:round(clamp(7.05+.56*Math.sin(i*.5)+.38*Math.cos(i*.22),5.6,8.5),1),steps:Math.round(clamp(8150+1900*Math.sin(i*.42)+1350*Math.cos(i*.92)+(weekDay===0?-1100:0),3500,14000)),weight:round(79.8-i*.009+.25*Math.sin(i*.15),1)});
 }
 const workoutDays=[-1,-4,-7,-10,-14,-17,-21,-24].map((offset,i)=>({id:`demo-workout-${i}`,date:shiftDate(today(),offset),name:i%2?'CrossFit · Técnica + WOD':'CrossFit · Fuerza + WOD',type:'CrossFit',minutes:i%3===0?55:60,rpe:6+(i%3),synthetic:true}));
 const meals=[
 {id:'demo-meal-a',date:today(),name:'Tostadas con tomate y aceite',category:'Desayuno',calories:390,protein:11,carbs:52,fat:17,synthetic:true},
 {id:'demo-meal-b',date:today(),name:'Arroz con verduras y pollo',category:'Comida',calories:670,protein:44,carbs:68,fat:22,synthetic:true},
 {id:'demo-meal-c',date:today(),name:'Yogur natural y frutos secos',category:'Merienda',calories:235,protein:14,carbs:16,fat:13,synthetic:true}
 ];
 const labs=[];const labSample={glucose:[92,88,90],ldl:[117,113,108],hdl:[51,54,56],hba1c:[5.3,5.2,5.1],vitaminD:[27,32,35],ferritin:[96,100,106]};
 const offsets=[-175,-80,-18];
 Object.entries(labSample).forEach(([key,values])=>values.forEach((value,i)=>labs.push({id:`demo-lab-${key}-${i}`,date:shiftDate(today(),offsets[i]),key,value,source:'Laboratorio ficticio',synthetic:true})));
 return {version:1,mode:'DEMO',createdAt:new Date().toISOString(),days,workouts:workoutDays,meals,labs,proteinTarget:125,dark:false};
}
function load(){try{let data=JSON.parse(localStorage.getItem(STORAGE_KEY));if(data?.version===1&&Array.isArray(data.days)&&Array.isArray(data.labs)){
  // Demo values roll forward automatically if opened on a later day.
  if(data.days[data.days.length-1]?.date!==today()){
   const fresh=sampleData();const oldEnd=data.days[data.days.length-1]?.date;
   const diff=Math.round((fromKey(today())-fromKey(oldEnd))/86400000);
   if(diff>0 && diff<365) {data.days=data.days.map(p=>({...p,date:shiftDate(p.date,diff)}));data.workouts=data.workouts.map(w=>({...w,date:shiftDate(w.date,diff)}));data.meals=data.meals.map(m=>({...m,date:shiftDate(m.date,diff)}));data.labs=data.labs.map(l=>({...l,date:shiftDate(l.date,diff)}));}
   else {data.days=fresh.days;}
  }
  return data;
 }}catch(e){console.warn('Se reiniciará el estado de demostración:',e)}return sampleData();}
let db=load();
let ui={page:'today',metric:'hrv',range:30,lab:'glucose',weekOffset:0,selectedDay:null,nutritionDate:today(),selectedChartDate:null,messages:[{role:'assistant',kind:'welcome'}]};
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}catch(e){toast('No se han podido guardar los cambios en este navegador.')}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>el.classList.remove('show'),3200)}
const getPoints = (metric,range=30) => db.days.slice(-range).map(d=>({date:d.date,value:d[metric]}));
const getLatest = key => db.days.at(-1)?.[key]??0;
function avgMetric(key,count=7,offset=0){const a=db.days.slice(-offset-count, offset? -offset:undefined).map(x=>x[key]);return mean(a)}
const activeSessions=(start,end)=>db.workouts.filter(w=>w.date>=start&&w.date<=end).sort((a,b)=>b.date.localeCompare(a.date));
function formatMetric(metric,value){return num(value,METRICS[metric]?.decimals??0)}
function chart(metric,range=30,mini=false){
 const points=getPoints(metric,range), vals=points.map(p=>p.value);if(!points.length) return '<div class="empty-state">No hay registros.</div>';
 const W=mini?580:760,H=mini?170:300,L=mini?10:56,R=mini?10:20,T=mini?17:17,B=mini?12:42;
 const low=Math.min(...vals),high=Math.max(...vals),spread=Math.max(high-low,2),min=low-spread*.20,max=high+spread*.20;
 const x=i=>L+i*(W-L-R)/Math.max(points.length-1,1);
 const y=v=>T+(max-v)*(H-T-B)/(max-min);
 const coords=points.map((p,i)=>[x(i),y(p.value)]);
 const line=coords.map(([a,b],i)=>`${i?'L':'M'}${round(a,2)} ${round(b,2)}`).join(' ');
 const area=`${line} L ${x(points.length-1)} ${H-B} L ${x(0)} ${H-B} Z`;
 const grid=mini?'':[0,.25,.5,.75,1].map(t=>{const vy=T+(H-T-B)*t;let value=max-(max-min)*t;return `<line x1="${L}" x2="${W-R}" y1="${vy}" y2="${vy}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 6"/><text x="${L-12}" y="${vy+4}" text-anchor="end" font-size="10" fill="#98a99a">${formatMetric(metric,value)}</text>`}).join('');
 const endText=mini?'':Array.from(new Set([0,Math.round((points.length-1)/3),Math.round((points.length-1)*2/3),points.length-1])).map(i=>`<text x="${x(i)}" y="${H-10}" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}" font-size="11" fill="#9aaa9c">${fmtDate(points[i].date)}</text>`).join('');
 const key='graphfade-'+(mini?'small-':'large-')+metric;
 const focusIndex=points.findIndex(p=>p.date===ui.selectedChartDate);
 const pointsCircles=mini?'':points.map((p,i)=>{
  const selected=i===focusIndex;
  return `<g class="chart-point" tabindex="0" role="button" aria-label="${fmtDate(p.date)}: ${formatMetric(metric,p.value)} ${METRICS[metric].unit}" data-chart-date="${p.date}"><circle cx="${x(i)}" cy="${y(p.value)}" r="${selected?6:10}" fill="${selected?'#447d57':'transparent'}" stroke="${selected?'#fff':'none'}" stroke-width="2"/><title>${fmtDate(p.date,{day:'numeric',month:'long',year:'numeric'})}: ${formatMetric(metric,p.value)} ${METRICS[metric].unit}</title></g>`}).join('');
 return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución simulada de ${METRICS[metric].name.toLowerCase()}, ${range} días">
 <defs><linearGradient id="${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#78ac85" stop-opacity=".20"/><stop offset="100%" stop-color="#9ecbaa" stop-opacity="0"/></linearGradient></defs>
 ${grid}<path d="${area}" fill="url(#${key})"/><path d="${line}" stroke="#558a66" fill="none" stroke-width="${mini?3:3}" stroke-linecap="round" stroke-linejoin="round"/>${pointsCircles}${endText}
 </svg>`;
}
function ring(percent,label){const v=clamp(percent,0,100),r=47,c=2*Math.PI*r;return `<svg class="mini-ring" viewBox="0 0 120 120" role="img" aria-label="${label}: ${num(percent)} por ciento"><circle cx="60" cy="60" r="${r}" stroke="#e8efe7" stroke-width="9" fill="none"/><circle cx="60" cy="60" r="${r}" stroke="#69a07c" stroke-width="9" fill="none" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-v/100)}" transform="rotate(-90 60 60)" stroke-linecap="round"/><text x="60" y="60" text-anchor="middle" dominant-baseline="middle" class="ring-center-label">${Math.round(percent)}%</text><text x="60" y="79" text-anchor="middle" class="ring-small">${esc(label)}</text></svg>`}
function stat(label,value,unit,note,ic){return `<div class="stat-card"><div class="stat-label"><span class="stat-icon">${icon(ic)}</span>${esc(label)}</div><div class="stat-value">${esc(value)}<small>${esc(unit)}</small></div><div class="stat-note">${esc(note)}</div></div>`;}
const header = (eyebrow,title,desc,action='')=>`<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1><p class="page-desc">${desc}</p></div>${action}</div>`;
const demoFooter = () => `<p class="footer-disclaimer">MYHEALTH OS · PROTOTIPO ALPHA 0.1 · TODOS LOS INDICADORES SON SINTÉTICOS · NO UTILIZAR PARA DECISIONES MÉDICAS</p>`;
function renderToday(){
 const d=db.days.at(-1),last7=db.days.slice(-7),steps7=last7.reduce((n,p)=>n+p.steps,0),sessions=activeSessions(shiftDate(today(),-6),today());
 const sleep=d.sleep,steps=d.steps,hrv=d.hrv,rest=d.resting;
 const positiveSleep=round(avgMetric('sleep',7)-avgMetric('sleep',7,7),1);
 return `<div class="content">
 ${header('PANORÁMICA PERSONAL · UN VISTAZO','Tu salud, de un vistazo.','Una lectura clara de tus hábitos, movimiento y descanso. Todo lo que ves aquí es una simulación.')}
 <div class="hero-banner"><div><span class="hero-tag">${icon('sun')} PANORAMA DE HOY</span><h2>Pequeños datos.<br>Mejores decisiones.</h2><p>Primera versión para explorar la experiencia diaria. Los valores no proceden de Apple Salud ni de un wearable.</p></div><div class="hero-visual" aria-hidden="true"><span class="hero-wave">∿∿</span></div></div>
 <div class="space-18"></div>
 <div class="grid four">
 ${stat('Sueño',num(sleep,1),'horas',`${positiveSleep>=0?'+':''}${num(positiveSleep,1)} h vs. semana anterior`,'moon')}
 ${stat('FC en reposo',num(rest),'lpm','Medición simulada de hoy','heart')}
 ${stat('Pasos',num(steps),'pasos',`${num(steps7)} pasos en 7 días`,'steps')}
 ${stat('HRV',num(hrv),'ms','Valor simulado del día','activity')}
 </div>
 <div class="section-heading"><h2>Lo que importa hoy</h2><span>Resumen del día</span></div>
 <div class="grid panel-split">
 <section class="panel"><div class="panel-title-row"><div><h2 class="panel-title">Tendencia de frecuencia cardíaca</h2><div class="panel-subtitle">Frecuencia en reposo · últimos 14 días</div></div><button class="small-link" data-page="trends">Ver evolución →</button></div><div class="chart-annot"><div class="chart-big-value">${num(rest)}<small>lpm</small></div><span class="tag">Dato simulado</span></div><div class="chart-shell">${chart('resting',14,true)}</div></section>
 <section class="panel"><div class="panel-title-row"><div><h2 class="panel-title">Objetivo de movimiento</h2><div class="panel-subtitle">Referencia ajustable en versiones futuras</div></div>${icon('steps')}</div><div class="rings-body">${ring(steps/10000*100,'de 10.000')}<div class="legend-list"><div><div class="legend-item"><span class="legend-label"><i class="legend-dot" style="background:#6eaa7c"></i>Hoy</span><span class="legend-value">${num(steps)}</span></div><div class="space-12"></div><div class="progress-track"><div class="progress-fill" style="width:${clamp(steps/100,0,100)}%"></div></div></div><div class="legend-item"><span class="legend-label">Referencia de demo</span><span class="legend-value">10.000</span></div><div class="legend-item"><span class="legend-label">Media semanal</span><span class="legend-value">${num(steps7/7)}</span></div></div></div></section>
 </div>
 <div class="space-18"></div>
 <div class="grid wide-split">
 <section class="panel"><div class="panel-title-row"><div><h2 class="panel-title">Descanso nocturno</h2><div class="panel-subtitle">Distribución ficticia del sueño</div></div><span class="tag blue">${num(sleep,1)} horas</span></div><div class="sleep-track"><span style="width:23%;background:#496f67"></span><span style="width:50%;background:#8bb4a1"></span><span style="width:27%;background:#c4d9bd"></span></div><div class="sleep-legend"><div class="sleep-legend-item"><i class="legend-dot" style="background:#496f67"></i> Profundo<strong>23%</strong></div><div class="sleep-legend-item"><i class="legend-dot" style="background:#8bb4a1"></i> Ligero<strong>50%</strong></div><div class="sleep-legend-item"><i class="legend-dot" style="background:#c4d9bd"></i> REM<strong>27%</strong></div></div><div class="inline-note">${icon('info')} Las fases son ilustrativas; no representan mediciones clínicas ni datos de un dispositivo.</div></section>
 <section class="panel"><div class="panel-title-row"><h2 class="panel-title">Señales de esta semana</h2><button class="small-link" data-page="assistant">Explorar →</button></div><div class="insight-list"><div class="insight"><span class="insight-icon">${icon('activity')}</span><div><b>${sessions.length} entrenamientos recientes</b><p>Registrados en el periodo de 7 días de este entorno de prueba.</p></div></div><div class="insight"><span class="insight-icon">${icon('moon')}</span><div><b>Media de sueño: ${num(avgMetric('sleep',7),1)} h</b><p>Una descripción del histórico simulado, no una valoración clínica.</p></div></div></div></section>
 </div>${demoFooter()}</div>`;
}
function renderTrends(){
 const metric=METRICS[ui.metric],pts=getPoints(ui.metric,ui.range),recent=mean(pts.map(p=>p.value)),prev=db.days.slice(-2*ui.range,-ui.range).map(x=>x[ui.metric]),previous=prev.length?mean(prev):null;
 const diff=previous===null?null:recent-previous;
 const selectedPoint=pts.find(p=>p.date===ui.selectedChartDate);
 const result=selectedPoint?.value??pts.at(-1).value;
 return `<div class="content">${header('02 / MÉTRICAS','Evolución.','Explora la trayectoria de cada indicador, cambia el periodo y consulta mediciones concretas.')}
 <div class="metric-controls">${Object.entries(METRICS).map(([k,m])=>`<button class="metric-chip ${ui.metric===k?'active':''}" data-metric="${k}">${icon(m.icon)} ${m.short}</button>`).join('')}</div>
 <section class="panel"><div class="panel-title-row"><div><div class="panel-overline">${esc(metric.name)}</div><div class="panel-subtitle">Histórico sintético e interactivo</div></div><div class="pill-controls">${[7,30,90].map(n=>`<button data-range="${n}" class="${ui.range===n?'active':''}">${n} días</button>`).join('')}</div></div>
 <div class="chart-annot"><div><div class="chart-big-value">${formatMetric(ui.metric,result)}<small>${metric.unit}</small></div><div class="panel-subtitle">${selectedPoint?fmtDate(selectedPoint.date,{weekday:'long',day:'numeric',month:'long'}):'Última medición'}</div></div><span class="tag">${ui.range} días</span></div>
 <div class="chart-shell">${chart(ui.metric,ui.range)}</div>
 <div class="chart-context">${icon('info')} ${esc(metric.description)} Toca o haz clic en un punto para consultar el valor de ese día.</div></section>
 <div class="space-18"></div>
 <div class="grid three"><section class="panel"><div class="tiny-label">Media del periodo</div><div class="value-metric">${formatMetric(ui.metric,recent)} <span class="sup">${metric.unit}</span></div><span class="tag">${ui.range} días</span></section><section class="panel"><div class="tiny-label">Periodo anterior equivalente</div><div class="value-metric">${previous===null?'—':formatMetric(ui.metric,previous)} <span class="sup">${metric.unit}</span></div><span class="tag neutral">${previous===null?'Sin datos suficientes':`${prev.length} registros`}</span></section><section class="panel"><div class="tiny-label">Variación de medias</div><div class="value-metric">${diff===null?'—':`${diff>0?'+':''}${num(diff,metric.decimals)}`} <span class="sup">${metric.unit}</span></div><span class="tag neutral">Descriptivo · no causal</span></section></div>
 <div class="section-heading"><h2>Cómo interpretamos este dato</h2></div><div class="panel quiet"><div class="insight">${icon('shield')}<div><b>Sin conclusiones automáticas precipitadas</b><p>Una tendencia por sí sola no explica su causa. Para obtener análisis fiables necesitaremos procedencia, hora, técnica de medición y contexto del dispositivo.</p></div></div></div>${demoFooter()}</div>`;
}
function weekStart(weekOffset=0){const d=fromKey(today()); const dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow+weekOffset*7);return dateKey(d)}
function renderActivity(){
 const start=weekStart(ui.weekOffset),end=shiftDate(start,6),weekSessions=activeSessions(start,end);
 const totalMin=weekSessions.reduce((sum,w)=>sum+w.minutes,0),avgRpe=mean(weekSessions.map(w=>w.rpe));
 const selectedDay=ui.selectedDay&&ui.selectedDay>=start&&ui.selectedDay<=end?ui.selectedDay:null;
 const shown=selectedDay?weekSessions.filter(x=>x.date===selectedDay):weekSessions;
 return `<div class="content">${header('03 / MOVIMIENTO','Actividad.','Sesiones, carga percibida y continuidad. Entrenar más no siempre significa recuperarse mejor.',`<button class="primary-btn" data-action="add-workout">${icon('plus')} Registrar sesión</button>`)}
 <div class="grid three activity-stats">${stat('Sesiones de la semana',num(weekSessions.length),'',`${fmtDate(start)} – ${fmtDate(end)}`,'activity')}${stat('Tiempo total',num(totalMin),'min','Duración acumulada','clock')}${stat('Esfuerzo percibido',weekSessions.length?num(avgRpe,1):'—','/ 10','Media RPE, autoevaluación','bolt')}</div>
 <div class="space-18"></div>
 <section class="panel"><div class="panel-title-row"><div><h2 class="panel-title">Tu semana de movimiento</h2><div class="panel-subtitle">Selecciona un día para filtrar sesiones</div></div><div class="date-nav"><button type="button" data-action="prev-week" aria-label="Semana anterior">‹</button><span>${fmtDate(start,{day:'numeric',month:'short'})} – ${fmtDate(end,{day:'numeric',month:'short'})}</span><button type="button" data-action="next-week" aria-label="Semana posterior" ${ui.weekOffset===0?'disabled':''}>›</button></div></div><div class="week-days">${Array.from({length:7},(_,i)=>{const date=shiftDate(start,i),has=weekSessions.some(w=>w.date===date),selected=selectedDay===date;return `<button type="button" data-action="pick-day" data-date="${date}" class="day-tile ${has?'trained':''} ${selected?'selected':''}" aria-pressed="${selected}"><div class="dow">${['L','M','X','J','V','S','D'][i]}</div><div class="day-num">${fromKey(date).getDate()}</div><div class="workout-dot"></div></button>`}).join('')}</div></section>
 <div class="space-18"></div><section class="panel"><div class="panel-title-row"><div><h2 class="panel-title">${selectedDay?`Sesiones · ${fmtDate(selectedDay)}`:'Sesiones registradas'}</h2><div class="panel-subtitle">${shown.length} resultados en el periodo seleccionado</div></div>${selectedDay?'<button class="small-link" data-action="clear-day">Ver toda la semana</button>':''}</div>
 ${shown.length?shown.map(w=>`<div class="workout-row"><div class="workout-type-icon">${icon('activity')}</div><div class="workout-info"><b>${esc(w.name)}</b><small>${fmtDate(w.date,{weekday:'short',day:'numeric',month:'long'})} · ${esc(w.type)}</small></div><div class="workout-meta"><span class="tag">${num(w.minutes)} min</span><span class="tag ${w.rpe>=8?'amber':''}">RPE ${num(w.rpe)}</span><button class="danger-mini" data-action="delete-workout" data-id="${attributes(w.id)}" aria-label="Eliminar sesión">✕</button></div></div>`).join(''):'<div class="empty-state">No hay sesiones para este filtro. Prueba con otra fecha o registra un entrenamiento de ejemplo.</div>'}
 </section><div class="section-heading"><h2>Una métrica que sí podemos explicar</h2></div><section class="panel quiet"><div class="insight">${icon('info')}<div><b>RPE: percepción del esfuerzo de 1 a 10</b><p>Es una anotación subjetiva útil para dar contexto a una sesión. Aquí no calculamos una puntuación de recuperación propietaria ni damos recomendaciones clínicas automáticas.</p></div></div></section>${demoFooter()}</div>`;
}
function labRecords(key=ui.lab){return db.labs.filter(l=>l.key===key).sort((a,b)=>a.date.localeCompare(b.date))}
function labStatus(record){const def=LABS[record.key];return !def?'Desconocido':record.value<def.lo?'Por debajo':record.value>def.hi?'Por encima':'En rango ilustrativo'}
function renderLabs(){
 const grouped=Object.entries(LABS),selected=LABS[ui.lab],records=labRecords(),last=records.at(-1),previous=records.at(-2);
 const v=last?.value,normal=last?labStatus(last)==='En rango ilustrativo':false;
 const pointPct=last?clamp((v-(selected.lo-(selected.hi-selected.lo)*.3))/((selected.hi-selected.lo)*1.6)*100,1,99):50;
 return `<div class="content">${header('04 / BIOMARCADORES','Analíticas.','Valores, rangos de referencia y evolución histórica. En esta demo la información es completamente ficticia.',`<button class="primary-btn" data-action="add-lab">${icon('plus')} Añadir valor</button>`)}
 <div class="grid panel-split"><section class="panel"><div class="panel-title-row"><div><h2 class="panel-title">Biomarcadores</h2><div class="panel-subtitle">Elige un indicador para consultar su histórico</div></div><span class="tag">${grouped.length} marcadores</span></div>
 ${grouped.map(([key,d])=>{const r=labRecords(key).at(-1);return `<div class="lab-row"><button class="lab-select ${key===ui.lab?'active':''}" data-lab="${key}"><div class="lab-row-label"><b>${esc(d.name)}</b><small>${esc(d.category)}</small></div></button><div class="lab-row-value"><strong>${r?num(r.value,d.decimals):'—'}</strong><small>${esc(d.unit)}</small></div><span class="tag ${r&&labStatus(r)!=='En rango ilustrativo'?'amber':'neutral'}">${r?labStatus(r):'Sin registros'}</span></div>`}).join('')}
 </section>
 <section class="panel"><div class="panel-title-row"><div><h2 class="panel-title">${esc(selected.name)}</h2><div class="panel-subtitle">${esc(selected.category)} · ${esc(selected.unit)}</div></div><span class="tag blue">Fuente ficticia</span></div>
 <div class="lab-pair"><div class="metric-box"><small>Último resultado</small><strong>${last?num(last.value,selected.decimals):'—'} <span class="sup">${selected.unit}</span></strong><span>${last?fmtDate(last.date,{day:'numeric',month:'long',year:'numeric'}):'Sin registros'}</span></div><div class="metric-box"><small>Resultado anterior</small><strong>${previous?num(previous.value,selected.decimals):'—'} <span class="sup">${selected.unit}</span></strong><span>${previous?fmtDate(previous.date,{day:'numeric',month:'long',year:'numeric'}):'Sin registros'}</span></div></div>
 <div class="tiny-label">Rango de referencia ilustrativo</div><div class="range-indicator"><span class="range-pointer" style="left:${pointPct}%"></span></div><div class="range-labels"><span>${num(selected.lo,selected.decimals)} ${selected.unit}</span><span>${num(selected.hi,selected.decimals)} ${selected.unit}</span></div><div class="space-18"></div><div class="inline-note">${icon('shield')} Los rangos son ficticios y simplificados; dependen del laboratorio, contexto y situación clínica. No deben utilizarse para interpretar analíticas reales.</div>
 <div class="panel-title-row"><h3 class="panel-title">Histórico</h3><span class="tag">${records.length} resultados</span></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Valor</th><th>Fuente</th></tr></thead><tbody>${records.slice().reverse().map(r=>`<tr><td>${fmtDate(r.date)}</td><td><strong>${num(r.value,selected.decimals)} ${selected.unit}</strong></td><td>${esc(r.source)}</td></tr>`).join('')}</tbody></table></div></section></div>
 <div class="space-18"></div><section class="panel quiet"><div class="panel-title-row"><h3 class="panel-title">Importación de PDF e imágenes</h3><span class="tag neutral">Próxima integración</span></div><p class="page-desc">No simulamos haber leído PDFs. Primero habrá que construir extracción, conservación del documento original y una pantalla de revisión manual del resultado.</p></section>${demoFooter()}</div>`;
}
function nutritionForDate(){return db.meals.filter(m=>m.date===ui.nutritionDate)}
function nutritionTotals(){return nutritionForDate().reduce((a,m)=>({calories:a.calories+m.calories,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}),{calories:0,protein:0,carbs:0,fat:0})}
function renderNutrition(){
 const totals=nutritionTotals(),meals=nutritionForDate(),percent=clamp(totals.protein/db.proteinTarget*100,0,100);
 const mealIcons={Desayuno:'☕',Comida:'◉',Merienda:'◕',Cena:'☾',Snack:'◇'};
 return `<div class="content">${header('05 / ALIMENTACIÓN','Nutrición.','Un diario sencillo para comprender la alimentación y el aporte proteico.',`<button class="primary-btn" data-action="add-meal">${icon('plus')} Registrar comida</button>`)}
 <div class="panel-title-row"><div class="date-nav"><button data-action="prev-food-day" aria-label="Día anterior">‹</button><span>${fmtDate(ui.nutritionDate,{weekday:'long',day:'numeric',month:'long'})}</span><button data-action="next-food-day" aria-label="Día posterior" ${ui.nutritionDate>=today()?'disabled':''}>›</button></div><button class="small-link" data-action="protein-goal">Cambiar meta de proteína →</button></div>
 <div class="nutrition-summary"><section class="macro-card"><h3>Proteína registrada</h3><strong>${num(totals.protein)} <span class="sup">/ ${num(db.proteinTarget)} g</span></strong><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div><small>${num(percent)}% de la referencia de demostración</small></section><section class="macro-card"><h3>Carbohidratos</h3><strong>${num(totals.carbs)} <span class="sup">g</span></strong><small>Suma de registros manuales</small></section><section class="macro-card"><h3>Grasas</h3><strong>${num(totals.fat)} <span class="sup">g</span></strong><small>Suma de registros manuales</small></section></div>
 <div class="space-18"></div><div class="grid wide-split"><section class="panel"><div class="panel-title-row"><div><h2 class="panel-title">Diario de comidas</h2><div class="panel-subtitle">${meals.length} registros en la fecha seleccionada</div></div><button class="small-link" data-action="add-meal">+ Añadir</button></div>
 ${meals.length?meals.map(m=>`<div class="meal-row"><div class="meal-icon" aria-hidden="true">${mealIcons[m.category]||'◇'}</div><div class="meal-row-info"><b>${esc(m.name)}</b><small>${esc(m.category)} · dato de demostración</small></div><div class="meal-macros"><strong>${num(m.calories)} kcal</strong>${num(m.protein)} g proteína</div><button class="danger-mini" data-action="delete-meal" data-id="${attributes(m.id)}" aria-label="Eliminar comida">✕</button></div>`).join(''):'<div class="empty-state">Sin comidas para este día. Puedes añadir registros ficticios y probar el cálculo de macros.</div>'}
 </section><section class="panel"><div class="panel-title-row"><div><h2 class="panel-title">Resumen nutricional</h2><div class="panel-subtitle">Agregación de las entradas</div></div>${icon('nutrition')}</div><div class="chart-big-value">${num(totals.calories)}<small>kcal registradas</small></div><div class="space-18"></div>
 ${[['Proteínas',totals.protein*4,'#6ba17a'],['Carbohidratos',totals.carbs*4,'#b8c8a7'],['Grasas',totals.fat*9,'#d7b084']].map(([name,kcal,color])=>`<div style="margin:15px 0"><div class="trend-grid"><span class="label">${name}</span><span class="figure" style="font-size:11px">${num(kcal)} kcal</span></div><div class="progress-track" style="margin-top:8px"><div class="progress-fill" style="width:${totals.calories?clamp(kcal/totals.calories*100,0,100):0}%;background:${color}"></div></div></div>`).join('')}
 <div class="inline-note">${icon('info')} Esta información es orientativa y solo suma lo introducido. No equivale al consumo total diario si faltan comidas.</div></section></div>
 <div class="section-heading"><h2>Registro mediante fotografía</h2></div><section class="panel quiet"><div class="panel-title-row"><h3 class="panel-title">Estimación multimodal</h3><span class="tag neutral">No conectada todavía</span></div><p class="page-desc">La primera versión permite añadir macros manualmente. El análisis de imágenes llegará cuando tengamos un proveedor de IA, controles de privacidad y revisión de cantidades.</p></section>${demoFooter()}</div>`;
}
function answer(question){
 const s=question.toLocaleLowerCase('es-ES');
 const evidence=[];
 if(/prote[ií]n|comid|aliment|macro|kcal|nutric/.test(s)){
  const total=nutritionTotals();evidence.push(`Diario del ${fmtDate(ui.nutritionDate,{day:'numeric',month:'long'})}: ${nutritionForDate().length} entradas`, `Proteínas registradas: ${num(total.protein)} g; referencia de demo: ${num(db.proteinTarget)} g`);
  return {title:'Proteína registrada',body:`En la fecha seleccionada constan ${num(total.protein)} g de proteína, equivalentes al ${num(total.protein/db.proteinTarget*100)}% de la meta editable de demostración (${num(db.proteinTarget)} g).\n\nEsto describe únicamente lo registrado: si falta la cena o alguna comida, no permite concluir si alcanzaste tus necesidades reales.`,evidence};
 }
 if(/anal[ií]tic|glucosa|colesterol|vitamina|biomarc|ldl|ferrit|hba1c/.test(s)){
  const old=labRecords('glucose'),ldl=labRecords('ldl'),a=old.at(-2),b=old.at(-1),c=ldl.at(-2),d=ldl.at(-1);
  evidence.push(`Glucosa: ${num(a?.value||0)} → ${num(b?.value||0)} mg/dL`, `LDL: ${num(c?.value||0)} → ${num(d?.value||0)} mg/dL`, 'Datos sintéticos etiquetados como laboratorio ficticio');
  return {title:'Cambios entre analíticas',body:`En los registros ficticios, la glucosa pasa de ${num(a?.value||0)} a ${num(b?.value||0)} mg/dL y el colesterol LDL pasa de ${num(c?.value||0)} a ${num(d?.value||0)} mg/dL.\n\nEstos cambios son descriptivos. No permiten identificar causas ni deben interpretarse médicamente sin contexto y rangos del laboratorio real.`,evidence};
 }
 if(/entren|crossfit|actividad|recuper|rpe|carga|ejerc/.test(s)){
  const w=activeSessions(shiftDate(today(),-13),today()); const total=w.reduce((sum,x)=>sum+x.minutes,0);evidence.push(`${w.length} sesiones registradas en 14 días`, `${total} minutos acumulados`, `Sueño medio 7 días: ${num(avgMetric('sleep',7),1)} h`);
  return {title:'Actividad y recuperación',body:`En los últimos 14 días figuran ${w.length} entrenamientos (${num(total)} minutos) en la simulación. La media de sueño de 7 días es ${num(avgMetric('sleep',7),1)} horas.\n\nHipótesis que valdría la pena explorar con datos reales: cómo cambian el sueño y la frecuencia cardíaca después de sesiones de mayor intensidad. Estos indicadores no prueban por sí solos una recuperación insuficiente.`,evidence};
 }
 if(/sue[ñn]|descans|dorm|noche/.test(s)){
  const curr=avgMetric('sleep',7),prev=avgMetric('sleep',7,7),delta=curr-prev;evidence.push(`Sueño medio últimos 7 días: ${num(curr,1)} h`,`Sueño medio 7 días anteriores: ${num(prev,1)} h`,`Cambio descriptivo: ${delta>0?'+':''}${num(delta,1)} h`);
  return {title:'Comparación del descanso',body:`El sueño medio ficticio es de ${num(curr,1)} horas en los últimos 7 días frente a ${num(prev,1)} horas en los 7 anteriores (${delta>0?'+':''}${num(delta,1)} h).\n\nSe aprecia una diferencia temporal, pero no puede atribuirse al entrenamiento sin controlar el resto de factores.`,evidence};
 }
 if(/frecuencia|card[ií]ac|pulso|hrv|coraz[oó]n/.test(s)){
  const curr=avgMetric('resting',7),prev=avgMetric('resting',7,7);evidence.push(`FC reposo: ${num(curr,0)} lpm (7 días)`, `Periodo anterior: ${num(prev,0)} lpm`, `HRV media 7 días: ${num(avgMetric('hrv',7))} ms`);
  return {title:'Frecuencia cardíaca',body:`La frecuencia cardíaca en reposo media es ${num(curr)} lpm en los últimos 7 días frente a ${num(prev)} lpm en la semana anterior. La HRV media simulada es ${num(avgMetric('hrv',7))} ms.\n\nUn cambio sostenido puede merecer observación, pero no indica por sí mismo una enfermedad o una mejora de salud.`,evidence};
 }
 evidence.push('Módulos disponibles: evolución, actividad, analíticas y nutrición','No se ha consultado ningún modelo de IA externo');
 return {title:'Consulta fuera del alcance de la demo',body:'Este asistente aún no tiene un modelo de lenguaje. Solo responde a un conjunto delimitado de preguntas sobre los datos ficticios de la aplicación.\n\nPrueba a preguntar por el sueño, la FC en reposo, la proteína, las analíticas o los entrenamientos.',evidence};
}
function renderAssistant(){
 const questions=['¿Estoy durmiendo mejor que la semana anterior?','¿Cuánta proteína llevo registrada?','¿Qué cambió entre mis analíticas?','¿Cómo van mis entrenamientos y recuperación?'];
 return `<div class="content">${header('06 / INTELIGENCIA','Tu asistente de salud.','Respuestas explicables basadas en los registros de la demo. Aún no hay conexión con un modelo de lenguaje.')}
 <div class="assistant-layout"><section class="panel chat-panel"><div class="chat-head"><span class="assistant-icon">${icon('assistant')}</span><div><b>MyHealth Intelligence</b><small>Motor de reglas local · sin APIs ni envío de datos</small></div><span class="tag" style="margin-left:auto">MODO DEMO</span></div><div id="chat-thread" class="chat-thread">${ui.messages.map(m=>m.role==='user'?`<div class="chat-bubble user">${esc(m.text)}</div>`:m.kind==='welcome'?`<div class="chat-bubble assistant"><span class="answer-title">Hola. Explora tus datos de ejemplo.</span>Estoy conectado exclusivamente a los módulos de esta demo. Puedo ayudarte a comparar tendencias, actividad, comidas y analíticas ficticias. No soy todavía un modelo de IA.</div>`:`<div class="chat-bubble assistant"><span class="answer-title">${esc(m.title)}</span>${esc(m.body)}<div class="evidence"><b>DATOS CONSULTADOS · TRAZABILIDAD</b>${m.evidence.map(x=>`<div>• ${esc(x)}</div>`).join('')}</div></div>`).join('')}</div><form id="chat-form" class="chat-composer"><input type="text" id="chat-input" maxlength="260" required autocomplete="off" placeholder="Pregunta por tus datos de ejemplo…" aria-label="Escribir una pregunta"/><button type="submit" aria-label="Enviar pregunta">➤</button></form></section>
 <aside><section class="panel"><div class="panel-title-row"><h2 class="panel-title">Prueba estas preguntas</h2>${icon('assistant')}</div>${questions.map(q=>`<button class="suggestion" data-question="${attributes(q)}">${icon('arrow')} &nbsp; ${esc(q)}</button>`).join('')}</section><div class="warning-note"><b>Qué está funcionando</b><p>Consulta datos locales, realiza cálculos descriptivos y muestra las fuentes. No genera texto libre con IA, no accede a tus datos reales y no proporciona diagnósticos.</p><b>Qué desarrollaremos después</b><p>Modelo de IA desacoplado, permisos por dato, evaluación de respuestas, límites médicos y auditoría de consultas.</p></div></aside></div>${demoFooter()}</div>`;
}
function renderNav(){const out= NAV.map(n=>`<button type="button" class="nav-item ${ui.page===n.id?'active':''}" data-page="${n.id}" aria-current="${ui.page===n.id?'page':'false'}">${icon(n.icon)}<span>${n.label}</span>${ui.page===n.id?'<span class="nav-bullet"></span>':''}</button>`).join('');$('#side-nav').innerHTML=out;$('#bottom-nav').innerHTML=NAV.map(n=>`<button type="button" class="mobile-nav-item ${ui.page===n.id?'active':''}" data-page="${n.id}" aria-label="${n.label}" aria-current="${ui.page===n.id?'page':'false'}">${icon(n.icon)}<span>${n.label}</span></button>`).join('');$('#breadcrumb').textContent=NAV.find(n=>n.id===ui.page)?.label||'Hoy';}
function render(){document.body.classList.toggle('dark',db.dark);renderNav();const renderers={today:renderToday,trends:renderTrends,activity:renderActivity,labs:renderLabs,nutrition:renderNutrition,assistant:renderAssistant};$('#main-content').innerHTML=(renderers[ui.page]||renderToday)();}
function goto(page){if(!NAV.some(n=>n.id===page))return;ui.page=page;ui.selectedChartDate=null;render();window.scrollTo({top:0,behavior:'instant'});}
function modal(title,subtitle,body){const wrap=$('#modal-layer');wrap.hidden=false;wrap.innerHTML=`<div class="modal-box" role="dialog" aria-modal="true" aria-label="${attributes(title)}"><div class="modal-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="modal-close" data-action="close-modal" aria-label="Cerrar">×</button></div>${body}</div>`;const first=$('input,select,button',wrap);first?.focus();}
function closeModal(){$('#modal-layer').hidden=true;$('#modal-layer').innerHTML='';}
function formWorkout(){modal('Registrar actividad','Crea una entrada de demostración. No introduzcas datos médicos privados.',`<form id="workout-form"><div class="form-grid"><div class="field full"><label for="w-name">Nombre de la sesión</label><input id="w-name" name="name" maxlength="70" required value="CrossFit · WOD"/></div><div class="field"><label for="w-date">Fecha</label><input id="w-date" type="date" name="date" max="${today()}" required value="${today()}"/></div><div class="field"><label for="w-type">Tipo</label><select id="w-type" name="type"><option>CrossFit</option><option>Fuerza</option><option>Cardio</option><option>Caminar</option><option>Otro</option></select></div><div class="field"><label for="w-min">Duración (min)</label><input id="w-min" name="minutes" type="number" min="1" max="480" value="50" required/></div><div class="field"><label for="w-rpe">Esfuerzo percibido (1–10)</label><input id="w-rpe" name="rpe" type="number" min="1" max="10" value="7" required/></div></div><div class="form-actions"><button type="button" class="subtle-btn" data-action="close-modal">Cancelar</button><button type="submit" class="primary-btn">Guardar demo</button></div></form>`);}
function formMeal(){modal('Añadir comida','Registro manual de demostración. Las cifras introducidas no se calculan automáticamente.',`<form id="meal-form"><div class="form-grid"><div class="field full"><label for="m-name">Comida o plato</label><input id="m-name" name="name" maxlength="90" placeholder="Ej.: tortilla con ensalada" required/></div><div class="field"><label for="m-date">Fecha</label><input id="m-date" type="date" name="date" max="${today()}" value="${ui.nutritionDate}" required/></div><div class="field"><label for="m-category">Momento del día</label><select id="m-category" name="category"><option>Desayuno</option><option>Comida</option><option>Merienda</option><option>Cena</option><option>Snack</option></select></div><div class="field"><label for="m-protein">Proteínas (g)</label><input id="m-protein" type="number" name="protein" min="0" max="500" step="0.1" value="25" required/></div><div class="field"><label for="m-carbs">Carbohidratos (g)</label><input id="m-carbs" type="number" name="carbs" min="0" max="600" step="0.1" value="40" required/></div><div class="field"><label for="m-fat">Grasas (g)</label><input id="m-fat" type="number" name="fat" min="0" max="400" step="0.1" value="12" required/></div><div class="field"><label for="m-kcal">Calorías (kcal)</label><input id="m-kcal" type="number" name="calories" min="0" max="5000" value="368" required/></div></div><div class="form-actions"><button type="button" class="subtle-btn" data-action="close-modal">Cancelar</button><button class="primary-btn" type="submit">Guardar demo</button></div></form>`);}
function formLab(){modal('Añadir un biomarcador','Entrada sintética para probar el histórico. No uses valores clínicos personales.',`<form id="lab-form"><div class="form-grid"><div class="field full"><label for="l-key">Biomarcador</label><select id="l-key" name="key">${Object.entries(LABS).map(([key,d])=>`<option value="${key}" ${ui.lab===key?'selected':''}>${esc(d.name)} (${esc(d.unit)})</option>`).join('')}</select></div><div class="field"><label for="l-date">Fecha</label><input id="l-date" type="date" name="date" max="${today()}" value="${today()}" required/></div><div class="field"><label for="l-value">Valor del resultado</label><input id="l-value" type="number" name="value" min="0" max="3000" step="0.1" placeholder="Solo dato ficticio" required/></div></div><div class="form-actions"><button type="button" class="subtle-btn" data-action="close-modal">Cancelar</button><button type="submit" class="primary-btn">Guardar demo</button></div></form>`);}
function formGoal(){modal('Meta de proteína','Este objetivo es una referencia de prueba, no una recomendación nutricional individual.',`<form id="goal-form"><div class="field"><label for="goal-number">Referencia diaria (g)</label><input type="number" id="goal-number" name="target" min="20" max="350" step="1" value="${db.proteinTarget}" required/></div><div class="form-actions"><button class="subtle-btn" type="button" data-action="close-modal">Cancelar</button><button class="primary-btn" type="submit">Actualizar meta</button></div></form>`);}
function formSettings(){modal('Preferencias','Configuración local de la demostración.',`<div class="setting-row"><div><b>Modo oscuro</b><small>Cambia la apariencia de la aplicación</small></div><input type="checkbox" id="dark-setting" ${db.dark?'checked':''} aria-label="Modo oscuro"/></div><div class="setting-row"><div><b>Exportar los datos</b><small>Descarga todos los registros sintéticos como JSON</small></div><button class="subtle-btn" data-action="export">Exportar</button></div><div class="setting-row"><div><b>Reiniciar la demo</b><small>Elimina cambios locales y recupera el conjunto inicial</small></div><button class="subtle-btn" data-action="reset">Reiniciar</button></div><div class="warning-note"><b>Privacidad actual</b><p>Este prototipo almacena sus entradas en el navegador mediante localStorage, sin cifrado ni autenticación. No introduzcas datos médicos reales. No hay backend ni solicitudes a servicios de inteligencia artificial.</p></div>`);}
function exportDemo(){const str=JSON.stringify({...db,exportedAt:new Date().toISOString(),notice:'SOLO DATOS SINTÉTICOS — NO APTO PARA INFORMACIÓN MÉDICA REAL'},null,2);const blob=new Blob([str],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`myhealth-demo-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Exportación de datos sintéticos iniciada.');}
function uniqueId(){return `demo-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}
function ask(q){if(!q||!q.trim())return;ui.messages.push({role:'user',text:q.slice(0,260)});ui.messages.push({role:'assistant',...answer(q)});if(ui.messages.length>20)ui.messages=[ui.messages[0],...ui.messages.slice(-18)];render();requestAnimationFrame(()=>{const thread=$('#chat-thread');if(thread)thread.scrollTop=thread.scrollHeight;});}
function removeById(collection,id){const item=db[collection].find(m=>m.id===id);if(!item)return;if(!window.confirm('¿Eliminar este registro de demostración?'))return;db[collection]=db[collection].filter(m=>m.id!==id);save();render();toast('Registro de prueba eliminado.')}
document.addEventListener('click',e=>{
 const p=e.target.closest('[data-page]');if(p){goto(p.dataset.page);return;}
 const metric=e.target.closest('[data-metric]');if(metric){ui.metric=metric.dataset.metric;ui.selectedChartDate=null;render();return;}
 const range=e.target.closest('[data-range]');if(range){ui.range=Number(range.dataset.range);ui.selectedChartDate=null;render();return;}
 const lab=e.target.closest('[data-lab]');if(lab){ui.lab=lab.dataset.lab;render();return;}
 const point=e.target.closest('[data-chart-date]');if(point){ui.selectedChartDate=point.dataset.chartDate;render();return;}
 const question=e.target.closest('[data-question]');if(question){ask(question.dataset.question);return;}
 const a=e.target.closest('[data-action]');if(!a)return;
 switch(a.dataset.action){
 case 'settings':formSettings();break;
 case 'export':exportDemo();break;
 case 'reset':if(window.confirm('¿Restablecer todos los valores de ejemplo? Se descartarán los cambios de esta demo.')){const dark=db.dark;db=sampleData();db.dark=dark;save();ui.messages=[{role:'assistant',kind:'welcome'}];ui.nutritionDate=today();ui.weekOffset=0;ui.selectedDay=null;closeModal();render();toast('Demo reiniciada.')};break;
 case 'close-modal':closeModal();break;
 case 'add-workout':formWorkout();break;
 case 'delete-workout':removeById('workouts',a.dataset.id);break;
 case 'prev-week':ui.weekOffset=Math.max(-20,ui.weekOffset-1);ui.selectedDay=null;render();break;
 case 'next-week':ui.weekOffset=Math.min(0,ui.weekOffset+1);ui.selectedDay=null;render();break;
 case 'pick-day':ui.selectedDay=ui.selectedDay===a.dataset.date?null:a.dataset.date;render();break;
 case 'clear-day':ui.selectedDay=null;render();break;
 case 'add-lab':formLab();break;
 case 'add-meal':formMeal();break;
 case 'delete-meal':removeById('meals',a.dataset.id);break;
 case 'prev-food-day':ui.nutritionDate=shiftDate(ui.nutritionDate,-1);render();break;
 case 'next-food-day':if(ui.nutritionDate<today())ui.nutritionDate=shiftDate(ui.nutritionDate,1);render();break;
 case 'protein-goal':formGoal();break;
 }
});
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(fromKey(s).getTime())&&s<=today()}
const validNumber=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
document.addEventListener('submit',e=>{
 const f=e.target;if(!['workout-form','meal-form','lab-form','goal-form','chat-form'].includes(f.id))return;e.preventDefault();
 if(f.id==='chat-form'){ask($('#chat-input').value);return;}
 const data=Object.fromEntries(new FormData(f));
 if(f.id==='workout-form'){
  const w={id:uniqueId(),date:data.date,name:data.name.trim(),type:data.type,minutes:Number(data.minutes),rpe:Number(data.rpe),synthetic:true};
  if(!validDate(w.date)||!w.name||!validNumber(w.minutes,1,480)||!validNumber(w.rpe,1,10))return toast('Revisa los campos de la sesión.');db.workouts.push(w);ui.weekOffset=Math.floor((fromKey(w.date)-fromKey(weekStart(0)))/604800000);ui.weekOffset=clamp(ui.weekOffset,-20,0);ui.selectedDay=null;
 }
 if(f.id==='meal-form'){
  const m={id:uniqueId(),name:data.name.trim(),date:data.date,category:data.category,calories:Number(data.calories),protein:Number(data.protein),carbs:Number(data.carbs),fat:Number(data.fat),synthetic:true};
  if(!validDate(m.date)||!m.name||!['Desayuno','Comida','Merienda','Cena','Snack'].includes(m.category)||!validNumber(m.calories,0,5000)||!validNumber(m.protein,0,500)||!validNumber(m.carbs,0,600)||!validNumber(m.fat,0,400))return toast('Revisa los campos de la comida.');db.meals.push(m);ui.nutritionDate=m.date;
 }
 if(f.id==='lab-form'){
  const l={id:uniqueId(),date:data.date,key:data.key,value:Number(data.value),source:'Entrada manual de demostración',synthetic:true};
  if(!validDate(l.date)||!LABS[l.key]||!validNumber(l.value,0,3000))return toast('Revisa los campos del biomarcador.');db.labs.push(l);ui.lab=l.key;
 }
 if(f.id==='goal-form'){const v=Number(data.target);if(!validNumber(v,20,350))return toast('La referencia debe estar entre 20 y 350 g.');db.proteinTarget=v;}
 save();closeModal();render();toast('Cambio guardado solo en este navegador.');
});
document.addEventListener('change',e=>{if(e.target.id==='dark-setting'){db.dark=e.target.checked;save();render();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal-layer').hidden)closeModal();if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-chart-date]')){e.preventDefault();ui.selectedChartDate=e.target.dataset.chartDate;render();}});
$('#modal-layer').addEventListener('click',e=>{if(e.target===$('#modal-layer'))closeModal();});
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
save();render();
})();
