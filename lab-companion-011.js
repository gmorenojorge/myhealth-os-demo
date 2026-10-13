/* MyHealth OS · Health Companion LAB 0.11
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
  const MEMKEY='myhealth_os_lab_companion_memories_011';
  const CHATKEY='myhealth_os_lab_companion_chat_011';
  const ENDPOINT='https://myhealth-os-companion-lab.gmoreno-jorge.workers.dev';
  const TYPES={objetivo:'Objetivo',preferencia:'Preferencia',contexto:'Contexto',compromiso:'Compromiso'};
  function loadExtra(key,initial) {try {const o=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(o)?o:initial;} catch {return initial;} }
  let memories=loadExtra(MEMKEY,[]).filter(x=>x&&TYPES[x.type]&&typeof x.text==='string').slice(-35);
  let history=loadExtra(CHATKEY,[]).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').slice(-40);
  let activeToken='', chatDraft='',chatConsent=false,sendContext=true,chatBusy=false,chatError='',editingMemory='',prefillMemory='';
  const newId=()=>globalThis.crypto?.randomUUID?.()||('m'+Date.now()+'-'+Math.random().toString(36).slice(2));
  function persistExtra(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{B.toast('No se pudo guardar en este navegador.');return false;}}

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
    const openCommitment=memories.find(m=>m.type==='compromiso'&&m.status!=='done');
    if(openCommitment)list.push({id:'commit:'+openCommitment.id,type:'memory',focus:'equilibrio',tag:'ASUNTO PENDIENTE',
      title:'Un compromiso por revisar',message:openCommitment.text.slice(0,160),
      reason:'Compromiso guardado y confirmado por ti en la memoria personal.',action:'Ver mi memoria'});
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
  function chatPanel(d){
    const past=history.slice(-16).map(m=>'<div class="hc-chat-msg '+(m.role==='user'?'mine':'theirs')+'"><span>'+ (m.role==='user'?'TÚ':'COMPANION')+'</span><p>'+ESC(m.content)+'</p></div>').join('');
    return '<section class="hc-converse" id="hc-converse"><div class="hc-sectionline"><h3>Hablemos</h3><small>IA contextual · disponible al conectar Worker</small></div>'+ 
      '<p class="hc-chat-explain">Habla con el Companion usando tus recuerdos y los hitos confirmados, solo si autorizas el envío. No se envía el audio ni las propuestas sin confirmar.</p>'+ 
      '<div class="hc-chat-thread" role="log" aria-live="polite">'+(past||'<div class="hc-chat-empty">Puedes empezar con: «¿Qué recuerdas de mis objetivos?» o «¿Qué seguimiento tenemos pendiente?»</div>')+
      (chatBusy?'<div class="hc-chat-msg theirs"><span>COMPANION</span><p>Preparando respuesta…</p></div>':'')+'</div>'+ 
      (chatError?'<p class="hc-chat-error" role="alert">'+ESC(chatError)+'</p>':'')+
      '<label class="hc-fieldlabel" for="hc-chat-input">Tu mensaje</label><textarea id="hc-chat-input" maxlength="900" rows="3" placeholder="Pregúntame algo o cuéntame qué te importa…" '+(chatBusy?'disabled':'')+'>'+ESC(chatDraft)+'</textarea>'+ 
      '<div class="hc-chat-switch"><label><input type="checkbox" id="hc-chat-context" '+(sendContext?'checked':'')+'> Compartir recuerdos y acontecimientos confirmados</label></div>'+ 
      '<div class="hc-chat-switch"><label><input type="checkbox" id="hc-chat-consent" '+(chatConsent?'checked':'')+'> Autorizo enviar estos datos a Cloudflare para generar la respuesta.</label></div>'+ 
      '<details class="hc-connection"><summary>Configurar conexión IA · Cloudflare</summary><p>Worker independiente: <code>myhealth-os-companion-lab</code>. Debes desplegarlo y poner su token secreto; no utilices credenciales de Cloudflare.</p>'+ 
      '<label class="hc-fieldlabel" for="hc-chat-token">Token del Companion (solo esta sesión)</label><input id="hc-chat-token" type="password" autocomplete="off" autocapitalize="off" value="'+ESC(activeToken)+'" placeholder="COMPANION_LAB_TOKEN">'+
      '<p>Destino: '+ESC(ENDPOINT)+'</p></details>'+ 
      '<div class="hc-chat-buttons"><button class="hc-primary" data-hc-action="chat-send" '+(chatBusy?'disabled':'')+'>Enviar mensaje →</button>'+ 
      (history.length?'<button class="hc-outline" data-hc-action="memory-from-chat">Guardar como recuerdo</button><button class="hc-outline" data-hc-action="chat-clear">Borrar chat</button>':'')+'</div>'+ 
      '<p class="hc-privacy">La conversación se guarda localmente sin cifrado adicional. El Worker procesa el mensaje y el contexto autorizado; no guarda historial en base de datos. Evita introducir datos médicos sensibles en esta fase.</p></section>';
  }
  function memoryPanel(){
    const item=memories.find(x=>x.id===editingMemory);
    return '<section id="hc-memory" class="hc-settings hc-memory-panel"><h3>Memoria personal</h3><p>Recuerdos que has guardado y puedes revisar. Nada se incorpora automáticamente a partir de las respuestas de la IA.</p>'+ 
      (memories.length?'<div class="hc-memory-items">'+memories.slice().reverse().map(m=>'<article class="hc-memory-item"><div><span>'+ESC(TYPES[m.type])+(m.status==='done'?' · Completado':'')+'</span><p>'+ESC(m.text)+'</p></div>'+ 
      '<div class="hc-memory-commands"><button data-hc-action="memory-edit" data-hc-id="'+ESC(m.id)+'">Editar</button>'+ 
      (m.type==='compromiso'?'<button data-hc-action="memory-done" data-hc-id="'+ESC(m.id)+'">'+(m.status==='done'?'Reabrir':'Hecho')+'</button>':'')+
      '<button data-hc-action="memory-delete" data-hc-id="'+ESC(m.id)+'">Eliminar</button></div></article>').join('')+'</div>':'<p class="hc-memory-empty">Aún no hay recuerdos guardados. Empieza con un objetivo o preferencia.</p>')+ 
      '<div class="hc-memory-form"><h4>'+ (item?'Modificar recuerdo':'Guardar un nuevo recuerdo')+'</h4>'+ 
      '<label class="hc-fieldlabel" for="hc-memory-type">Categoría</label><select id="hc-memory-type">'+Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'" '+((item?.type||'objetivo')===k?'selected':'')+'>'+v+'</option>').join('')+'</select>'+ 
      '<label class="hc-fieldlabel" for="hc-memory-text">¿Qué quieres recordar?</label><textarea id="hc-memory-text" rows="3" maxlength="260" placeholder="Ej.: Mi objetivo es entrenar dos veces por semana">'+ESC(item?.text||prefillMemory||'')+'</textarea>'+ 
      '<div class="hc-chat-buttons"><button class="hc-primary" data-hc-action="memory-save">'+(item?'Guardar cambios':'Confirmar y recordar')+'</button>'+(item?'<button class="hc-outline" data-hc-action="memory-cancel">Cancelar</button>':'')+'</div></div></section>';
  }
  function saveMemory(){
    const text=$('hc-memory-text')?.value.trim(),type=$('hc-memory-type')?.value;
    if(!text||text.length<4||text.length>260||!TYPES[type]){B.toast('Indica un recuerdo entre 4 y 260 caracteres.');return;}
    const backup=memories.map(m=>({...m}));
    if(editingMemory){const m=memories.find(x=>x.id===editingMemory);if(!m)return;m.type=type;m.text=text;m.updatedAt=new Date().toISOString();}
    else memories.push({id:newId(),type,text,status:'open',source:'confirmado_por_usuario',createdAt:new Date().toISOString()});
    memories=memories.slice(-35);
    if(!persistExtra(MEMKEY,memories)){memories=backup;return;}
    editingMemory='';prefillMemory='';schedule();B.toast('Recuerdo guardado. Puedes editarlo o eliminarlo.');
  }
  function approvedContext(){
    const date=today(),min=shift(date,-21);
    const confirmed=(B.getNotes()||[]).filter(n=>n.date>=min&&n.date<=date).flatMap(n=>
      (n.suggestions||[]).filter(e=>e.status==='confirmed').map(e=>({
        date:n.date,kind:String(e.kind||'').slice(0,30),title:String(e.title||'').slice(0,110),
        details:String(e.details||'').slice(0,160)
      })));
    return {
      goals:{focus:state.focus,weeklyTrainingTarget:state.target||null},
      memories:memories.filter(m=>m.status!=='done').slice(-20).map(m=>({category:m.type,text:m.text})),
      confirmedEvents:confirmed.slice(-30),
      checkins:state.checkins.slice(-12).map(c=>({date:c.date,answer:c.answer}))
    };
  }
  async function sendChat(){
    if(chatBusy)return;
    const msg=($('hc-chat-input')?.value||chatDraft).trim();
    const entered=$('hc-chat-token')?.value||activeToken;
    chatConsent=!!$('hc-chat-consent')?.checked;
    sendContext=!!$('hc-chat-context')?.checked;
    activeToken=entered;
    if(!msg||msg.length>900){chatError='Escribe un mensaje de hasta 900 caracteres.';schedule();return;}
    if(!chatConsent){chatError='Debes autorizar expresamente el envío de este mensaje.';schedule();return;}
    if(activeToken.length<16){chatError='Configura el token del Worker para activar la conversación con IA.';schedule();return;}
    const outbound=[...history.slice(-11).map(x=>({role:x.role,content:x.content})),{role:'user',content:msg}];
    const context=sendContext?approvedContext():null;
    chatBusy=true;chatError='';schedule();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);
    try{
      const response=await fetch(ENDPOINT+'/chat',{method:'POST',cache:'no-store',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+activeToken},
        body:JSON.stringify({messages:outbound,context}),signal:controller.signal});
      const result=await response.json().catch(()=>({ok:false,error:'Respuesta del servidor no válida.'}));
      if(!response.ok||!result.ok||typeof result.reply!=='string')throw Error(result.error||'No se recibió respuesta de la IA.');
      const old=history.slice();history.push({role:'user',content:msg},{role:'assistant',content:result.reply.slice(0,1800)});
      history=history.slice(-40);
      if(!persistExtra(CHATKEY,history)){history=old;throw Error('La respuesta llegó, pero no se ha podido guardar en este dispositivo.');}
      chatDraft='';chatError='';
    }catch(e){chatError=e.name==='AbortError'?'La IA ha tardado demasiado. Prueba de nuevo.':String(e.message||'No se pudo conectar.').slice(0,180);}
    finally{clearTimeout(timer);chatBusy=false;schedule();}
  }

  function assistant(d,cs) {
    const checkins=state.checkins.filter(c=>c.date>=shift(d.date,-6)).slice(-3).reverse();
    return '<div class="hc-companion"><section class="hc-hero"><small>HEALTH COMPANION · LAB 0.11</small>'+ 
      '<h2>Más allá de registrar.<br><em>Seguir contigo.</em></h2><p>Conecto lo que confirmas en el diario para proponerte pequeños pasos útiles.</p></section>'+ 
      '<div class="hc-kpis"><div><b>'+d.recent.length+'</b><small>notas · 7 días</small></div>'+ 
      '<div><b>'+d.events.length+'</b><small>hitos confirmados</small></div><div><b>'+state.checkins.length+'</b><small>respuestas</small></div></div>'+ 
      chatPanel(d)+memoryPanel()+
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
    if(a==='memory'){document.querySelector('[data-page="assistant"]')?.click();
      document.getElementById('hc-memory')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(a==='chat-send'){sendChat();return;}
    if(a==='chat-clear'){
      if(!history.length||!window.confirm('¿Borrar el historial de conversación guardado en este navegador?'))return;
      const old=history;history=[];if(!persistExtra(CHATKEY,history)){history=old;return;}chatError='';schedule();return;
    }
    if(a==='memory-save'){saveMemory();return;}
    if(a==='memory-edit'){editingMemory=b.dataset.hcId;prefillMemory='';schedule();return;}
    if(a==='memory-cancel'){editingMemory='';prefillMemory='';schedule();return;}
    if(a==='memory-delete'){
      if(!window.confirm('¿Borrar este recuerdo? No se podrá recuperar.'))return;
      const old=memories;memories=memories.filter(m=>m.id!==b.dataset.hcId);
      if(!persistExtra(MEMKEY,memories)){memories=old;return;}editingMemory='';schedule();return;
    }
    if(a==='memory-done'){
      const old=memories.map(m=>({...m}));const m=memories.find(x=>x.id===b.dataset.hcId);
      if(!m)return;m.status=m.status==='done'?'open':'done';m.updatedAt=new Date().toISOString();
      if(!persistExtra(MEMKEY,memories)){memories=old;return;}schedule();return;
    }
    if(a==='memory-from-chat'){
      const last=[...history].reverse().find(m=>m.role==='user');
      if(!last)return;editingMemory='';prefillMemory=last.content.slice(0,260);schedule();
      $('hc-memory')?.scrollIntoView({behavior:'smooth',block:'start'});return;
    }
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
  document.addEventListener('input',ev=>{
    if(ev.target?.id==='hc-chat-input')chatDraft=ev.target.value;
    if(ev.target?.id==='hc-chat-token')activeToken=ev.target.value;
  });
  document.addEventListener('change',ev=>{
    if(ev.target?.id==='hc-chat-consent')chatConsent=ev.target.checked;
    if(ev.target?.id==='hc-chat-context')sendContext=ev.target.checked;
  });
  document.addEventListener('keydown',ev=>{
    if(ev.target?.id==='hc-chat-input'&&ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){
      ev.preventDefault();sendChat();
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

#hc-converse{background:#fff;border:1px solid #e8e2dc;border-radius:20px;padding:17px;margin:18px 0}
.hc-sectionline{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:7px}
.hc-sectionline h3{margin:0;font-size:18px}.hc-sectionline small{color:#866a77;font-size:10px}
.hc-chat-explain{font-size:12px;line-height:1.55;color:#687687;margin:8px 0 12px}
.hc-chat-thread{max-height:340px;min-height:85px;overflow-y:auto;padding:10px;border-radius:13px;background:#f9f7f4;display:flex;flex-direction:column;gap:9px}
.hc-chat-msg{border-radius:13px;padding:10px 12px;max-width:90%;background:#fff;align-self:flex-start;border:1px solid #eee7e0}
.hc-chat-msg.mine{background:#e7edfc;border-color:#d6e0f8;align-self:flex-end}
.hc-chat-msg span{font-size:9px;letter-spacing:.7px;font-weight:800;color:#6d7a8c}.hc-chat-msg p{font-size:12px;line-height:1.55;margin:5px 0 0;color:#2e3a4a;white-space:pre-wrap;overflow-wrap:anywhere}
.hc-chat-empty{font-size:12px;color:#778390;padding:11px;line-height:1.6}.hc-fieldlabel{display:block;font-size:11px;font-weight:750;color:#546276;margin:13px 0 6px}
#hc-converse textarea,#hc-converse input[type=password],.hc-memory-form textarea,.hc-memory-form select{width:100%;box-sizing:border-box;border:1px solid #d8dde5;border-radius:12px;padding:11px;background:white;color:#27374c;font-size:16px;max-width:100%}
.hc-chat-switch{font-size:11px;color:#5f6b7c;margin:11px 0}.hc-chat-switch label{display:flex;gap:9px;align-items:flex-start;line-height:1.5}.hc-chat-switch input{width:18px;height:18px;flex:none}
.hc-connection{background:#f8f7f5;padding:11px;border-radius:12px;margin:13px 0}.hc-connection summary{font-size:11px;font-weight:780;color:#455f82}.hc-connection p{font-size:11px;line-height:1.5;color:#707c8b;overflow-wrap:anywhere}
.hc-chat-buttons{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;align-items:center}.hc-chat-buttons button{border-radius:11px;font-weight:750;padding:11px 12px;font-size:11px;min-height:42px;border:0}.hc-chat-buttons button:disabled{opacity:.5}
.hc-outline{background:#edf0f8;color:#34547c}.hc-chat-error{font-size:11px;background:#fff0ed;padding:10px;border-radius:12px;color:#9e453a;line-height:1.5}
.hc-memory-panel{scroll-margin-top:65px}.hc-memory-items{max-height:270px;overflow:auto;margin:10px 0}.hc-memory-item{padding:11px 0;border-bottom:1px solid #e9e6e3}
.hc-memory-item span{font-size:10px;font-weight:800;letter-spacing:.8px;color:#a16950}.hc-memory-item p{font-size:12px;color:#26374c;margin:5px 0 7px;overflow-wrap:anywhere}
.hc-memory-commands{display:flex;gap:8px;flex-wrap:wrap}.hc-memory-commands button{border:0;background:#f3f2f1;border-radius:8px;padding:7px 10px;font-size:11px;color:#425a73}
.hc-memory-commands button:last-child{color:#ad4a44}.hc-memory-form{border-top:1px solid #e7e2de;margin-top:12px;padding-top:12px}.hc-memory-form h4{font-size:13px;letter-spacing:0;text-transform:none;margin:0 0 12px;color:#26374c}
.hc-memory-empty{padding:9px;border-radius:10px;background:#f7f4f0}.hc-chat-error,.hc-privacy{overflow-wrap:anywhere}

`;
  document.head.appendChild(style);
  const observer=new MutationObserver(schedule);
  if($('homeEntries'))observer.observe($('homeEntries'),{childList:true});
  if($('otherContent'))observer.observe($('otherContent'),{childList:true});
  schedule();
})();
