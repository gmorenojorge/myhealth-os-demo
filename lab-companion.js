/* MyHealth OS · Health Companion LAB 0.10
 * Acompanamiento contextual, sin peticiones de red.
 * Lee solo las notas confirmadas del LAB y guarda preferencias en clave local aislada.
 * No sustituye una valoracion clinica.
 */
(() => {
  'use strict';
  const B = window.MyHealthNutritionBridge;
  if (!B) { console.error('Health Companion: no se encontro el puente del laboratorio.'); return; }

  const $ = id => document.getElementById(id);
  const KEY = 'myhealth_os_lab_companion_010';
  const ESC = s => String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[ch]);
  const localISO = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const today = () => localISO(new Date());
  const shift = (s,n) => { const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return localISO(d); };
  const labelDate = s => new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short'}).format(new Date(s+'T12:00:00'));
  const INITIAL = {focus:'equilibrio',target:0,checkins:[],dismissed:[]};
  const allowedFocus = ['equilibrio','movimiento','bienestar'];
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        focus: allowedFocus.includes(s.focus) ? s.focus : 'equilibrio',
        target: [0,2,3].includes(s.target) ? s.target : 0,
        checkins: Array.isArray(s.checkins) ? s.checkins.slice(-90) : [],
        dismissed: Array.isArray(s.dismissed) ? s.dismissed.slice(-80) : []
      };
    } catch { return {...INITIAL}; }
  }
  let state = load(), scheduled = false;
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch { B.toast('El navegador no pudo guardar tus preferencias.'); return false; }
  }
  function overview() {
    const date=today(), notes=B.getNotes() || [];
    const recent=notes.filter(n => n.date>=shift(date,-6) && n.date<=date);
    const events=recent.flatMap(n => (n.suggestions||[])
      .filter(e => e.status==='confirmed')
      .map(e => ({date:n.date,event:e})));
    const activity=events.filter(x => ['Actividad','Ejercicio','Entrenamiento','Deporte'].includes(x.event.kind));
    const pending=notes.filter(n => n.date===B.getDay())
      .reduce((sum,n) => sum+(n.suggestions||[]).filter(e => e.status==='pending').length,0);
    const stressDays=new Set(recent.filter(n => ['Con estrés','Cansado/a'].includes(n.mood) && n.date>=shift(date,-4)).map(n => n.date));
    const dow=new Date(date+'T12:00:00').getDay();
    const weekStart=shift(date,-((dow+6)%7));
    return {date,notes,recent,events,activity,pending,stressDays,weekStart,
      weekActivities: activity.filter(x=>x.date>=weekStart)};
  }
  function suggest(d) {
    const list=[];
    if (d.pending>0) list.push({id:'review:'+B.getDay(),type:'diary',focus:'equilibrio',tag:'REVISIÓN HUMANA',
      title:d.pending+' '+(d.pending===1?'propuesta por revisar':'propuestas por revisar'),
      message:'Comprueba los acontecimientos identificados antes de convertirlos en registros.',
      reason:'Hay propuestas pendientes en el diario del '+labelDate(B.getDay())+'.',action:'Revisar el diario'});
    const candidates=d.activity.filter(x => x.date<d.date && x.date>=shift(d.date,-2) &&
      /crossfit|entren|gimnasio|correr|corr[ií]|carrera|nataci|bicicleta|deporte|fuerza|intens/i
      .test([x.event.title,x.event.details,x.event.evidence].join(' ')));
    candidates.sort((a,b)=>b.date.localeCompare(a.date));
    const last=candidates.find(x => x.event.id && !state.checkins.some(c=>c.eventId===String(x.event.id)));
    if (last) list.push({id:'recover:'+String(last.event.id),eventId:String(last.event.id),type:'recovery',focus:'movimiento',tag:'SEGUIMIENTO',
      title:'¿Cómo te has recuperado?',
      message:'Registraste una actividad el '+labelDate(last.date)+'. ¿Cómo te has encontrado después?',
      reason:'Actividad confirmada: '+String(last.event.title||last.event.evidence||'Entrenamiento').slice(0,120)+'.'});
    if (d.stressDays.size>=2) list.push({id:'wellbeing:'+d.date,type:'record',focus:'bienestar',tag:'CONTINUIDAD',
      title:'¿Cómo te encuentras hoy?',
      message:'En dos días recientes señalaste cansancio o estrés. Puedes anotar cómo estás ahora.',
      reason:'Estados que tú mismo seleccionaste en dos fechas; no supone una valoración médica.',action:'Contarlo en una nota'});
    if (state.target>0 && d.weekActivities.length<state.target) list.push({id:'goal:'+d.weekStart,type:'record',focus:'movimiento',tag:'OBJETIVO PERSONAL',
      title:d.weekActivities.length+' de '+state.target+' sesiones registradas esta semana',
      message:'Solo se contabilizan actividades confirmadas; podrías haber entrenado sin registrarlo.',
      reason:'Has configurado voluntariamente '+state.target+' sesiones semanales.',action:'Registrar actividad'});
    if (!d.recent.length) list.push({id:'welcome:'+d.date,type:'record',focus:'equilibrio',tag:'PRIMER PASO',
      title:'Cuéntame algo de tu día',
      message:'Todavía no hay suficiente información reciente para un seguimiento contextual.',
      reason:'No encuentro notas de los últimos siete días; no he supuesto datos personales.',action:'Crear una nota'});
    if (!list.length) list.push({id:'present:'+d.date,type:'record',focus:'equilibrio',tag:'ACOMPAÑAMIENTO',
      title:'¿Hay algo que quieras recordar?',
      message:'No hay seguimientos abiertos a partir de los datos que has confirmado.',
      reason:'He examinado tus acontecimientos locales de la última semana.',action:'Registrar un momento'});
    const pending=list.filter(c=>!state.dismissed.includes(c.id));
    pending.sort((a,b)=>(b.focus===state.focus?1:0)-(a.focus===state.focus?1:0));
    if(pending.length) return pending;
    return [{id:'none:'+d.date,type:'record',focus:'equilibrio',tag:'AL DÍA',
      title:'No tienes seguimientos pendientes',
      message:'Has decidido ocultar las sugerencias disponibles.',
      reason:'Tus preferencias de esta sesión se guardan en este navegador.',action:'Crear una nota'}];
  }
  function actions(c) {
    if(c.type==='recovery')return '<div class="hc-answers">'+['Bien','Regular','Me costó']
      .map((a,i)=>'<button type="button" data-hc-action="answer" data-hc-index="'+i+'" data-hc-event="'+ESC(c.eventId)+'">'+a+'</button>').join('')+'</div>';
    return '<button type="button" class="hc-primary" data-hc-action="'+ESC(c.type)+'">'+ESC(c.action)+' →</button>';
  }
  function card(c) {
    return '<article class="hc-card"><div class="hc-kicker">✳ '+ESC(c.tag)+'</div><h3>'+ESC(c.title)+'</h3>'+ 
      '<p>'+ESC(c.message)+'</p><details><summary>¿Por qué me lo propones?</summary><p>'+ESC(c.reason)+'</p></details>'+ 
      '<div class="hc-actions">'+actions(c)+'<button type="button" class="hc-dismiss" data-hc-action="dismiss" data-hc-id="'+ESC(c.id)+'">Ahora no</button></div></article>';
  }
  function setting(name,entries,current){
    return '<div class="hc-setting-buttons">'+entries.map(([value,text])=>
      '<button type="button" data-hc-action="'+name+'" data-hc-value="'+ESC(value)+'" class="'+(current===value?'on':'')+'">'+text+'</button>').join('')+'</div>';
  }
  function assistant(d,cs) {
    const checkins=state.checkins.filter(c=>c.date>=shift(d.date,-6)).slice(-3).reverse();
    return '<div class="hc-companion"><section class="hc-hero"><small>HEALTH COMPANION · LAB 0.10</small>'+ 
      '<h2>Más allá de registrar.<br><em>Seguir contigo.</em></h2><p>Conecto lo que confirmas en el diario para proponerte pequeños pasos útiles.</p></section>'+ 
      '<div class="hc-kpis"><div><b>'+d.recent.length+'</b><small>notas · 7 días</small></div>'+ 
      '<div><b>'+d.events.length+'</b><small>hitos confirmados</small></div><div><b>'+state.checkins.length+'</b><small>respuestas</small></div></div>'+ 
      '<h3 class="hc-section-title">Lo que merece tu atención</h3>'+cs.slice(0,3).map(card).join('')+
      '<section class="hc-panel"><h3>Cómo quieres que te acompañe</h3>'+ 
      '<p>La prioridad y los objetivos los eliges tú. No los inventaré a partir de una nota.</p>'+ 
      '<h4>Tu prioridad</h4>'+setting('focus',[['equilibrio','Equilibrio'],['movimiento','Movimiento'],['bienestar','Bienestar']],state.focus)+
      '<h4>Objetivo semanal de actividad</h4>'+setting('target',[[0,'Sin fijar'],[2,'2 sesiones'],[3,'3 sesiones']],state.target)+'</section>'+ 
      (checkins.length?'<section class="hc-panel"><h3>Respuestas recientes</h3>'+checkins.map(c=>'<p>'+ESC(labelDate(c.date))+' · Recuperación: '+ESC(c.answer)+'</p>').join('')+'</section>':'')+
      '<p class="hc-privacy">Proactividad cuando abres la app, sin notificaciones externas. Análisis basado en reglas transparentes sobre registros locales, no en datos de Apple Salud ni en inferencias médicas. Los registros pueden estar incompletos.</p></div>';
  }
  function render(){
    const d=overview(),cs=suggest(d);
    const anchor=document.querySelector('#home .actions');
    if(anchor){
      let root=$('hc-home-root');
      if(!root){root=document.createElement('section');root.id='hc-home-root';anchor.parentNode.insertBefore(root,anchor);}
      const markup='<div class="hc-header">MYHEALTH COMPANION <span>● En contexto</span></div>'+card(cs[0]);
      if(root.innerHTML!==markup)root.innerHTML=markup;
    }
    if(B.getPage()==='assistant'){
      const root=$('otherContent');
      if(root){const markup=assistant(d,cs);if(root.innerHTML!==markup)root.innerHTML=markup;}
      const nav=document.querySelector('[data-page="assistant"]');
      if(nav && nav.lastChild?.nodeType===3)nav.lastChild.textContent='Companion';
      if($('otherTag'))$('otherTag').textContent='ACOMPAÑAMIENTO PERSONAL';
      if($('otherTitle'))$('otherTitle').textContent='Tu companion.';
      if($('otherText'))$('otherText').textContent='Contexto, continuidad y siguientes pasos.';
    }
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;render();});}
  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-hc-action]');if(!b)return;
    const a=b.dataset.hcAction;
    if(a==='diary'){document.querySelector('[data-page="diary"]')?.click();return;}
    if(a==='record'){document.querySelector('#home [data-capture="voice"]')?.click();return;}
    if(a==='answer'){
      const answer=['Bien','Regular','Me costó'][Number(b.dataset.hcIndex)],eventId=b.dataset.hcEvent;
      if(!answer||!eventId)return;
      const previous=state.checkins.slice();
      state.checkins=state.checkins.filter(c=>c.eventId!==eventId);
      state.checkins.push({eventId,answer,date:today(),at:new Date().toISOString()});
      state.checkins=state.checkins.slice(-90);
      if(!persist()){state.checkins=previous;return;}
      B.toast('Respuesta de seguimiento guardada en este dispositivo.');schedule();return;
    }
    if(a==='dismiss'){
      const previous=state.dismissed.slice();
      if(!state.dismissed.includes(b.dataset.hcId))state.dismissed.push(b.dataset.hcId);
      state.dismissed=state.dismissed.slice(-80);
      if(!persist()){state.dismissed=previous;return;}
      schedule();return;
    }
    if(a==='target'||a==='focus'){
      const previous=state[a];
      state[a]=a==='target'?Number(b.dataset.hcValue):b.dataset.hcValue;
      if(!persist()){state[a]=previous;return;}
      schedule();
    }
  });
  const style=document.createElement('style');
  style.textContent=`
#hc-home-root{margin:17px 0 7px}.hc-header{display:flex;justify-content:space-between;gap:9px;margin:0 3px 10px;font-size:10px;font-weight:850;letter-spacing:1px;color:#526178}.hc-header span{letter-spacing:0;color:#b56b4d}
.hc-card{border:1px solid #e8e0d9;background:linear-gradient(130deg,#fff9ed,#f4f1ff);border-radius:21px;margin:10px 0;padding:17px;box-shadow:0 8px 20px #27344a09}.hc-companion .hc-card{background:#fffefa}
.hc-kicker{font-size:10px;letter-spacing:1px;color:#ae604d;font-weight:850}.hc-card h3{font-size:19px;letter-spacing:-.45px;line-height:1.2;margin:10px 0 8px}.hc-card p{font-size:12px;line-height:1.55;color:#697482;margin:0 0 10px}.hc-card details{font-size:11px;color:#53698a}.hc-card details summary{cursor:pointer;font-weight:700}.hc-card details p{margin:6px 0;color:#748194;font-size:11px}
.hc-actions{margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.hc-actions button{min-height:43px;border:0;border-radius:12px;padding:10px 12px;font-size:11px;font-weight:750}.hc-primary{background:#273c54;color:white}.hc-dismiss{background:transparent;color:#85838d}.hc-answers{display:flex;flex-wrap:wrap;gap:6px}.hc-answers button{border:1px solid #ead3c3;background:#f4e6da;color:#734f45}
.hc-hero{background:linear-gradient(125deg,#263c55,#657188);color:#fff;border-radius:24px;padding:24px 19px}.hc-hero small{font-size:10px;letter-spacing:1.2px;color:#f6cbb4;font-weight:800}.hc-hero h2{font-family:Georgia,serif;font-size:27px;letter-spacing:-.7px;line-height:1.13;margin:13px 0}.hc-hero em{color:#ffdbbf;font-style:normal}.hc-hero p{font-size:12px;line-height:1.55;color:#e4e7ed;margin:0;max-width:310px}
.hc-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}.hc-kpis div{background:white;border:1px solid #e9e5e1;border-radius:14px;padding:12px 9px}.hc-kpis b{display:block;font-size:22px;color:#283c56}.hc-kpis small{font-size:10px;color:#778394;line-height:1.4;display:block}.hc-section-title{font-size:17px;margin:23px 0 12px}
.hc-panel{border:1px solid #e8e4e0;border-radius:19px;background:white;padding:17px;margin:17px 0}.hc-panel h3{font-size:16px;margin:0 0 8px}.hc-panel p{font-size:12px;line-height:1.5;color:#77818e}.hc-panel h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#7a8797;margin:17px 0 8px}
.hc-setting-buttons{display:flex;flex-wrap:wrap;gap:7px}.hc-setting-buttons button{min-height:43px;border:1px solid #e3e5ec;background:#f4f5f9;border-radius:11px;padding:10px 12px;color:#626f80;font-weight:750;font-size:11px}.hc-setting-buttons button.on{background:#e7edfa;border-color:#93a5ca;color:#29436c}.hc-privacy{font-size:10px;line-height:1.6;color:#9297a0;margin:16px 4px 24px}
`;
  document.head.appendChild(style);
  const observer=new MutationObserver(schedule);
  if($('homeEntries'))observer.observe($('homeEntries'),{childList:true});
  if($('otherContent'))observer.observe($('otherContent'),{childList:true});
  schedule();
})();
